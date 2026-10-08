const MICRO_FRONTEND_HOSTED_URL = (window as any).orch_env?.VITE_MICROFRONTEND_HOSTED_URL;
const GATEWAY_URL = (window as any).orch_env?.VITE_GATEWAY_URL;
const SIGNUP_ENABLED = (window as any).orch_env?.VITE_SIGN_UP_ENABLED === 'true' ? true : false;

/**
 * Shared base domain of the micro-frontends, derived from
 * `MICRO_FRONTEND_HOSTED_URL` by dropping its leading subdomain label.
 * e.g. `mfe.briggsdev.local` -> `briggsdev.local`.
 */
const getIframeAllowedBaseDomain = (): string => {
    try {
        const { hostname } = new URL(MICRO_FRONTEND_HOSTED_URL);
        const labels = hostname.split('.');
        return labels.length > 2 ? labels.slice(1).join('.') : hostname;
    } catch {
        return '';
    }
};

const IFRAME_ALLOWED_BASE_DOMAIN = getIframeAllowedBaseDomain();

/**
 * Allows any micro-frontend origin whose hostname matches the shared base
 * domain (the base domain itself or any of its subdomains), over http/https.
 * In dev, also allows `localhost`/`127.0.0.1` on any port.
 */
const isAllowedIframeOrigin = (origin: string): boolean => {
    if (!origin) {
        return false;
    }
    try {
        const { protocol, hostname } = new URL(origin);
        if (protocol !== 'http:' && protocol !== 'https:') {
            return false;
        }
        if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) {
            return true;
        }
        if (!IFRAME_ALLOWED_BASE_DOMAIN) {
            return false;
        }
        return (
            hostname === IFRAME_ALLOWED_BASE_DOMAIN ||
            hostname.endsWith(`.${IFRAME_ALLOWED_BASE_DOMAIN}`)
        );
    } catch {
        return false;
    }
};

export {
    MICRO_FRONTEND_HOSTED_URL,
    GATEWAY_URL,
    SIGNUP_ENABLED,
    IFRAME_ALLOWED_BASE_DOMAIN,
    isAllowedIframeOrigin,
};