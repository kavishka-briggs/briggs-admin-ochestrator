# Local Dev Proxies

This folder contains two small, standalone reverse proxies used **only for local
development**. They exist to work around browser **CORS** restrictions so the
orchestrator frontend (running on `http://localhost:5173`) can talk to the real
backend gateway and load remote micro‑frontend (MFE) modules that are hosted on
other origins.

Both proxies are **separate services** — they do not serve the frontend and the
frontend is not served from the gateway. Each upstream keeps its own origin.

| Proxy | Port | Tech | Purpose |
| ----- | ---- | ---- | ------- |
| `gateway-cors-proxy` | `8080` | Caddy | Adds CORS headers in front of the API gateway |
| `mfe-cors-proxy` | `4445` | Node | Fetches remote MFE bundles and strips headers that block cross‑origin loading |

---

## Why is this needed?

To develop the orchestrator you need the gateway API and the remote
micro‑frontends (MFEs) it loads. Running **every** MFE locally is slow and
painful, so instead we point local development at the shared **dev environment**
(`https://gateway.briggsdev.tech`, `https://*.briggsdev.tech`). This keeps
development fast — you only run the orchestrator itself and consume the already
deployed dev modules.

The catch: the dev environment **enforces CORS**. Locally the frontend runs on
`http://localhost:5173`, which is a **different origin** from:

- the gateway (`https://gateway.briggsdev.tech`), and
- the remote modules (`https://*.briggsdev.tech`).

Because dev doesn't whitelist `localhost`, the browser blocks these cross‑origin
requests (missing `Access-Control-Allow-Origin`, or restrictive
`Content-Security-Policy` / `X-Frame-Options` on the module bundles).

These proxies were built to solve exactly that. They sit in the middle, forward
each request to the real dev upstream, then **strip the blocking headers and add
permissive CORS headers** on the response so the browser accepts it. The frontend
keeps its own origin — this is *not* a single‑origin setup — and you avoid having
to run all the microfrontends locally.

---

## Prerequisites

- Docker Desktop running.

## Start / stop

From the `frontend` folder:

```powershell
# start both proxies
docker compose -f proxy/docker-compose.yml up -d

# view logs
docker compose -f proxy/docker-compose.yml logs -f

# stop
docker compose -f proxy/docker-compose.yml down
```

---

## 1. Gateway CORS proxy (port 8080)

A Caddy reverse proxy in front of the API gateway. It reflects the caller's
`Origin`, answers `OPTIONS` preflight requests, removes any upstream
`Access-Control-*` headers (to avoid duplicates) and injects permissive CORS.

- Config: [`Caddyfile`](./Caddyfile)
- Upstream is configured via `GATEWAY_UPSTREAM` / `GATEWAY_HOST` in
  [`docker-compose.yml`](./docker-compose.yml).

**Use it** by pointing the frontend's gateway URL at the proxy:

```dotenv
VITE_GATEWAY_URL=http://localhost:8080
```

---

## 2. MFE CORS proxy (port 4445)

A tiny dependency‑free Node server ([`mfe-proxy.js`](./mfe-proxy.js)) that fetches
remote module bundles (`remoteEntry.js` and their chunks) and returns them with
CORS headers, stripping `Content-Security-Policy`, `X-Frame-Options` and
`Cross-Origin-*` headers.

It supports three request forms; the **virtual‑host** form is the recommended one
because it lets Module Federation resolve each remote's relative chunk imports
correctly (each remote keeps its own origin).

### a) Virtual‑host form (recommended)

Map friendly `*.briggsdev.local` aliases to `127.0.0.1` in your OS hosts file, and
the proxy maps them back to the real `*.briggsdev.tech` hosts based on the incoming
`Host` header.

1. Add the aliases to your Windows hosts file (**Administrator** required) —
   ready to paste in [`hosts-entries.txt`](./hosts-entries.txt):

   ```powershell
   # PowerShell as Administrator, from the proxy folder:
   Get-Content .\hosts-entries.txt |
     Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() } |
     Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts"
   ```

   Verify: `Resolve-DnsName briggs-modules-authentication.briggsdev.local`

2. Point the frontend `.env` at the `.local` aliases on port `4445`, e.g.:

   ```dotenv
   VITE_MICROFRONTEND_HOSTED_URL=http://mfe.briggsdev.local:4445
   VITE_AUTH_MODULE=http://briggs-modules-authentication.briggsdev.local:4445/assets/remoteEntry.js
   VITE_CREW_BASIC_MODULE=http://module-crewbasic.briggsdev.local:4445/assets/remoteEntry.js
   VITE_DASHBOARD_BASIC_MODULE=http://module-dashboardbasic.briggsdev.local:4445/assets/remoteEntry.js
   VITE_QUARTERCOMPLETION_MODULE=http://module-quartercompletion.briggsdev.local:4445/assets/remoteEntry.js
   ```

3. Restart the dev server.

The mapping is configured with `LOCAL_DOMAIN_MAP` in
[`docker-compose.yml`](./docker-compose.yml), default:

```
.briggsdev.local=.briggsdev.tech,.briggsandwalker.local=.briggsandwalker.com
```

### b) Path form

```
http://localhost:4445/<host>/<path>
# e.g.
http://localhost:4445/briggs-modules-authentication.briggsdev.tech/assets/remoteEntry.js
```

### c) Query form (handy for one‑off fetches)

```
http://localhost:4445/?url=<absolute-url>
```

---

## Security note

The MFE proxy is guarded by an **allowlist** (`ALLOWED_HOSTS`, default
`briggsdev.tech,briggsandwalker.com`) so it can only fetch from those host
suffixes. This prevents it from being abused as an open proxy / SSRF vector.

These proxies are for **local development only** — do not deploy them or expose
them to untrusted networks.

---

## Quick verification

```powershell
# Gateway proxy: preflight returns CORS headers
curl.exe -s -i -X OPTIONS http://localhost:8080/ -H "Origin: http://localhost:5173" |
  Select-String -Pattern "HTTP/|Access-Control"

# MFE proxy (virtual-host form): remote entry resolves with CORS
curl.exe -s -i "http://localhost:4445/assets/remoteEntry.js" `
  -H "Host: briggs-modules-authentication.briggsdev.local:4445" `
  -H "Origin: http://localhost:5173" |
  Select-String -Pattern "HTTP/|Access-Control-Allow-Origin|content-type"
```

---

## Files

- [`docker-compose.yml`](./docker-compose.yml) — defines both proxy services.
- [`Caddyfile`](./Caddyfile) — gateway CORS proxy config.
- [`mfe-proxy.js`](./mfe-proxy.js) — MFE CORS proxy server.
- [`hosts-entries.txt`](./hosts-entries.txt) — host aliases to add to your OS hosts file.
