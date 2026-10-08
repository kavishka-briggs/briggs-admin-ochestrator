import { SidebarMenuItemType } from "@briggs-walker/briggsdesignsystem";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getActivePlugins } from "../api/api";
import { MICRO_FRONTEND_HOSTED_URL } from "../config";
import { DynamicModule, useDynamicModuleStore } from "../store/dynamicModuleStore";
import { useSidebarStore } from "../store/sidebarStore";
import { ModuleKey } from "../types";
import useDynamicSidebarMenu, { pluginMap } from "./useDynamicSidebarMenu.hooks";

export const useGetDynamicPlugins = () => {
    const { setModules, setPluginsFetched } = useDynamicModuleStore();
    const { setSidebarItems } = useSidebarStore();
    const { setMenuItems } = useDynamicSidebarMenu();
    const { t } = useTranslation();

    const fetchDynamicPlugins = useCallback(async () => {
        const plugins = await getActivePlugins();

        const sortedPlugins = [...plugins].sort((a, b) => (a.plugin_index ?? 0) - (b.plugin_index ?? 0)).filter(
            (plugin) => plugin.id === "module-quartercompletion" || plugin.id === "module-crewbasic" || plugin.id === "module-dashboardbasic" || plugin.id === "module-projectbasic" || plugin.id === "module-missioncontrol" || plugin.id === "briggs-address-module");

        const pluginMapObj = pluginMap(t);
        const activePlugins = sortedPlugins
            .map((plugin) => pluginMapObj[plugin.id as ModuleKey])
            .filter((item): item is SidebarMenuItemType => Boolean(item));
        setMenuItems(activePlugins);
        setSidebarItems(activePlugins);

        const pluginURLs: DynamicModule[] = sortedPlugins.map((plugin) => ({
            pluginID: plugin.id as ModuleKey,
            pluginURL: MICRO_FRONTEND_HOSTED_URL.replace("mfe", plugin.id),
            gatewayPath: plugin.gateway_path,
        }));
        setModules(pluginURLs);
        setPluginsFetched(true);
    }, [setMenuItems, setModules, setPluginsFetched, setSidebarItems, t]);

    return { fetchDynamicPlugins };
};