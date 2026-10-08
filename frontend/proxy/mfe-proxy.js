const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 4445;

// Allowlist of host suffixes we are willing to proxy to.
// This prevents the service from being abused as an open proxy / SSRF vector.
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'briggsdev.tech,briggsandwalker.com')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

// Virtual-host mapping: incoming Host suffix -> real upstream suffix.
// e.g. "foo.briggsdev.local" (points to 127.0.0.1 in the OS hosts file) is
// proxied to "https://foo.briggsdev.tech". This keeps each remote on its own
// origin so Module Federation relative chunk imports resolve naturally.
const LOCAL_MAP = (process.env.LOCAL_DOMAIN_MAP || '.briggsdev.local=.briggsdev.tech,.briggsandwalker.local=.briggsandwalker.com')
  .split(',')
  .map((pair) => pair.trim())
  .filter(Boolean)
  .map((pair) => {
    const [from, to] = pair.split('=');
    return { from: (from || '').trim().toLowerCase(), to: (to || '').trim().toLowerCase() };
  })
  .filter((m) => m.from && m.to);

// Response headers from the upstream that would otherwise block cross-origin
// embedding / loading in the browser. We drop them and add our own CORS headers.
const STRIP_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
]);

const isHostAllowed = (hostname) => {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Origin, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
  Vary: 'Origin',
});

const sendError = (res, origin, status, message) => {
  res.writeHead(status, { ...corsHeaders(origin), 'Content-Type': 'text/plain' });
  res.end(message);
};

/**
 * Resolve the upstream target URL for a request.
 *
 * Two forms are supported:
 *  1. Path form (preferred, works with Module Federation relative chunks):
 *       /<host>/<path...>            -> https://<host>/<path...>
 *       /https://<host>/<path...>    -> https://<host>/<path...>
 *     Relative chunk imports resolve against the remoteEntry URL, so they keep
 *     the same /<host>/<dir>/ prefix and stay routable through this proxy.
 *  2. Query form (handy for direct one-off fetches):
 *       /?url=<absolute-url>
 */
const resolveTarget = (reqUrl, hostHeader) => {
  // 1. Virtual-host mapping based on the request's Host header.
  const host = (hostHeader || '').split(':')[0].toLowerCase();
  const mapping = LOCAL_MAP.find((m) => host.endsWith(m.from));
  if (mapping) {
    const realHost = host.slice(0, host.length - mapping.from.length) + mapping.to;
    return new URL(`https://${realHost}${reqUrl.pathname}${reqUrl.search}`);
  }

  const queryUrl = reqUrl.searchParams.get('url');
  if (queryUrl) {
    return new URL(queryUrl);
  }

  const rest = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, '');
  if (!rest) {
    return null;
  }

  if (/^https?:\/\//i.test(rest)) {
    return new URL(rest);
  }
  // Browsers collapse the scheme's "//" in a path to "/", so repair "https:/host".
  if (/^https?:\//i.test(rest)) {
    return new URL(rest.replace(/^(https?):\/+/i, '$1://'));
  }
  return new URL(`https://${rest}`);
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  let targetUrl;
  try {
    targetUrl = resolveTarget(reqUrl, req.headers.host);
  } catch {
    targetUrl = null;
  }

  if (!targetUrl) {
    sendError(res, origin, 400, 'Provide a target via a *.local Host, /<host>/<path>, or /?url=<absolute-url>');
    return;
  }

  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    sendError(res, origin, 400, 'Only http/https protocols are allowed');
    return;
  }

  if (!isHostAllowed(targetUrl.hostname)) {
    sendError(res, origin, 403, `Host not allowed: ${targetUrl.hostname}`);
    return;
  }

  const client = targetUrl.protocol === 'https:' ? https : http;

  const upstreamReq = client.request(
    targetUrl,
    {
      method: req.method,
      // Send a clean, minimal header set. Do NOT forward Host/Origin/Referer.
      headers: {
        'User-Agent': req.headers['user-agent'] || 'mfe-proxy',
        Accept: req.headers['accept'] || '*/*',
        ...(req.headers['authorization'] ? { Authorization: req.headers['authorization'] } : {}),
      },
    },
    (upstreamRes) => {
      const headers = { ...corsHeaders(origin) };
      for (const [key, value] of Object.entries(upstreamRes.headers)) {
        if (!STRIP_HEADERS.has(key.toLowerCase())) {
          headers[key] = value;
        }
      }
      res.writeHead(upstreamRes.statusCode || 502, headers);
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.on('error', (err) => {
    sendError(res, origin, 502, `Upstream error: ${err.message}`);
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(upstreamReq);
  } else {
    upstreamReq.end();
  }
});

server.listen(PORT, () => {
  console.log(`MFE proxy listening on http://localhost:${PORT}`);
  console.log(`Allowed hosts: ${ALLOWED_HOSTS.join(', ')}`);
  console.log(`Domain map: ${LOCAL_MAP.map((m) => `${m.from} -> ${m.to}`).join(', ')}`);
  console.log('Usage: *.local Host header, or GET /<host>/<path>, or GET /?url=<absolute-http(s)-url>');
});
