import { generateSessionID, Tracker } from "@briggs-walker/briggs-logging";
import { EventName, EventProperties, TrackerOptions } from "@briggs-walker/briggs-logging/dist/types";
import { GATEWAY_URL } from "../config";

const initializeTracker = (): Tracker => {
    const token = localStorage.getItem("token") || "";
    const trackerOptions: TrackerOptions = {
        apiSecret: "API_SECRET",
        microfrontend: "briggs-orchestrator",
        sessionId: generateSessionID(),
        token: token,
        gatewayURL: GATEWAY_URL,
    };
    return new Tracker(trackerOptions);
};

const logger = (eventName: EventName, eventProperties: EventProperties, microfrontend: string = "briggs-orchestrator"): void => {
    const tracker = initializeTracker();
    tracker.logEvent(eventName, eventProperties, microfrontend);
};

const listen = (): void => {
    window.addEventListener('bw-logging-emitEvent', (event: any) => {
        const data = event.detail as {
            eventName: EventName;
            properties: EventProperties;
            microfrontend?: string;
        };

        logger(data.eventName, data.properties, data.microfrontend);
    });
};

export { logger, listen };