import { MICRO_FRONTEND_HOSTED_URL } from "../config";
import { useDynamicModuleStore } from "../store/dynamicModuleStore";

export const useGetDynamicURL = () => {
    const { modules } = useDynamicModuleStore();

    const AUTH_MODULE_REMOTE_URL = `${MICRO_FRONTEND_HOSTED_URL.replace('mfe', 'briggs-modules-authentication')}/assets/remoteEntry.js` || '';
    const pluginURL_quarterCompletion = modules.find((plugin) => plugin.pluginID === 'module-quartercompletion')?.pluginURL || '';
    const pluginURL_dashboardBasic = modules.find((plugin) => plugin.pluginID === 'module-dashboardbasic')?.pluginURL || '';
    const pluginURL_crewBasic = modules.find((plugin) => plugin.pluginID === 'module-crewbasic')?.pluginURL || '';
    const pluginURL_projectBasic = modules.find((plugin) => plugin.pluginID === 'module-projectbasic')?.pluginURL || '';
    const pluginURL_missionControl = modules.find((plugin) => plugin.pluginID === 'module-missioncontrol')?.pluginURL || '';
    const pluginURL_addressManagement = modules.find((plugin) => plugin.pluginID === 'briggs-address-module')?.pluginURL || '';
    const PROJECT_WIZARD_MODULE_REMOTE_URL = `${MICRO_FRONTEND_HOSTED_URL.replace('mfe', 'module-projectwizard')}/assets/remoteEntry.js` || '';
    const ONBOARDING_MODULE_REMOTE_URL = `${MICRO_FRONTEND_HOSTED_URL.replace('mfe', 'module-onboarding')}/assets/remoteEntry.js` || '';

    const QUARTER_COMPLETION_MODULE_REMOTE_URL = `${pluginURL_quarterCompletion}/assets/remoteEntry.js`;
    const DASHBOARD_BASIC_MODULE_REMOTE_URL = `${pluginURL_dashboardBasic}/assets/remoteEntry.js`;
    const CREW_BASIC_MODULE_REMOTE_URL = `${pluginURL_crewBasic}/assets/remoteEntry.js`;
    const PROJECT_BASIC_MODULE_REMOTE_URL = `${pluginURL_projectBasic}/assets/remoteEntry.js`;
    const MISSION_CONTROL_MODULE_REMOTE_URL = `${pluginURL_missionControl}/assets/remoteEntry.js`;
    const ADDRESS_MANAGEMENT_MODULE_REMOTE_URL = `${pluginURL_addressManagement}/assets/remoteEntry.js`;

    return {
        AUTH_MODULE_REMOTE_URL,
        QUARTER_COMPLETION_MODULE_REMOTE_URL,
        DASHBOARD_BASIC_MODULE_REMOTE_URL,
        CREW_BASIC_MODULE_REMOTE_URL,
        PROJECT_BASIC_MODULE_REMOTE_URL,
        MISSION_CONTROL_MODULE_REMOTE_URL,
        PROJECT_WIZARD_MODULE_REMOTE_URL,
        ONBOARDING_MODULE_REMOTE_URL,
        ADDRESS_MANAGEMENT_MODULE_REMOTE_URL
    };
}