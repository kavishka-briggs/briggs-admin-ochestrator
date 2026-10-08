type ModuleKey =
    'briggs-modules-authentication' |
    'module-quartercompletion' |
    'module-dashboardbasic' |
    'module-crewbasic' |
    'module-projectbasic' |
    'module-projectwizard' |
    'module-onboarding' |
    'module-missioncontrol' |
    'briggs-address-module'
    ;

interface IframeMessage {
    type: "REQUEST_TOKEN" | "SET_TOKEN";
    token?: string;
}

export type { ModuleKey, IframeMessage };
