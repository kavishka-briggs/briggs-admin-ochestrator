import { useEffect, useRef } from 'react';
import { useUserStore } from '../store/userStore';
import { isAllowedIframeOrigin } from '../config';
import { IframeMessage } from '../types';

/**
 * Parent-side postMessage bridge for embedded iframes.
 *
 * - Replies with a `SET_TOKEN` message when an iframe posts `REQUEST_TOKEN`.
 * - Broadcasts `SET_TOKEN` to all iframes whenever the auth token changes
 *   (e.g. on Keycloak token refresh) so their contexts stay in sync.
 *
 * Any micro-frontend origin whose hostname matches the shared base domain
 * (`IFRAME_ALLOWED_BASE_DOMAIN`) is trusted. The token is only ever sent to a
 * specific, validated origin (never `'*'`).
 */
const useTokenBridge = (): void => {
    const token = useUserStore((state) => state.user?.token);

    // Keep the latest token available to the message listener without
    // re-registering it on every token change.
    const tokenRef = useRef<string | undefined>(token);
    tokenRef.current = token;

    // Receiver: respond to token requests coming from trusted iframes.
    useEffect(() => {
        const handleMessage = (event: MessageEvent<IframeMessage>) => {
            if (!isAllowedIframeOrigin(event.origin)) {
                console.warn(`useTokenBridge: ignored message from unexpected origin: ${event.origin}`);
                return;
            }

            if (event.data?.type === 'REQUEST_TOKEN') {
                const message: IframeMessage = {
                    type: 'SET_TOKEN',
                    token: tokenRef.current ?? undefined,
                };
                (event.source as Window | null)?.postMessage(message, event.origin);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // Broadcaster: push the refreshed token to every mounted iframe.
    useEffect(() => {
        const message: IframeMessage = { type: 'SET_TOKEN', token: token ?? undefined };
        const frames = document.querySelectorAll('iframe');
        frames.forEach((frame) => {
            let targetOrigin: string;
            try {
                targetOrigin = new URL(frame.src).origin;
            } catch (e) {
                console.warn(`useTokenBridge: failed to parse iframe src: ${frame.src}`, e);
                return;
            }
            if (!isAllowedIframeOrigin(targetOrigin)) {
                return;
            }
            frame.contentWindow?.postMessage(message, targetOrigin);
        });
    }, [token]);
};

export default useTokenBridge;
