import { SidebarMenuItemType } from "@briggs-walker/briggsdesignsystem";
import { SubMenuLinks } from "@briggs-walker/briggsdesignsystem/dist/components/Sidebar/SidebarProfile/ProfileSubMenu/ProfileSubMenu";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useSidebarStore } from "../store/sidebarStore";
import { ModuleKey } from "../types";

export const pluginMap = (t: (key: string) => string): Partial<Record<ModuleKey, SidebarMenuItemType>> => ({
    "module-quartercompletion": {
        id: 1,
        label: t('module_orchestrator.sideBar.quarterCompletion'),
        icon: 'card-view',
        href: '/quarter-completion',
        subMenu: [
            { id: 1.1, label: t('module_orchestrator.sideBar.projects'), href: '/quarter-completion/projects' },
            { id: 1.2, label: t('module_orchestrator.sideBar.quarters'), href: '/quarter-completion/quarters' },
        ],
    },
    "module-dashboardbasic": {
        id: 2,
        label: t('module_orchestrator.sideBar.dashboard'),
        icon: 'home',
        href: '/dashboard',
    },
    "module-crewbasic": {
        id: 3,
        label: t('module_orchestrator.sideBar.crew'),
        icon: 'people',
        href: '/crew',
    },
    "module-projectbasic": {
        id: 4,
        label: t('module_orchestrator.sideBar.projects'),
        icon: 'folder',
        href: '/projects',
    },
    "module-missioncontrol": {
        id: 7,
        label: t('module_orchestrator.sideBar.missionControl'),
        icon: 'chart',
        href: '/mission-control/overview',
        subMenu: [
            { id: 7.1, label: t('module_orchestrator.sideBar.overview'), href: '/mission-control/overview' },
            { id: 7.2, label: t('module_orchestrator.sideBar.office'), href: '/mission-control/office' },
            { id: 7.3, label: t('module_orchestrator.sideBar.account'), href: '/mission-control/account' },
            { id: 7.4, label: t('module_orchestrator.sideBar.recruitment'), href: '/mission-control/recruitment' },
        ],
    },
    "module-projectwizard": {
        id: 5,
        label: t('module_orchestrator.sideBar.projectWizard'),
        icon: 'folder',
        href: '/project-wizard',
    },
    "briggs-address-module": {
        id: 6,
        label: t('module_orchestrator.sideBar.addressManagement'),
        icon: 'map',
        href: '/address-management',
        subMenu: [
            { id: 6.1, label: t('module_orchestrator.sideBar.createAddressSet'), href: '/address-management/manage-audience' },
        ],
    }
});

const useDynamicSidebarMenu = () => {
    const { t } = useTranslation();
    const [menuItems, setMenuItems] = useState<SidebarMenuItemType[]>([]);
    const profileSubMenuLinks: SubMenuLinks[] = useMemo(() => {
        return [
            {
                id: 'logout',
                label: t('module_orchestrator.sideBar.logOut'),
                color: 'red',
            },
        ];
    }, [t]);
    const { sidebarItems } = useSidebarStore();

    // Items from pluginMap are already translated, so use them directly.
    useEffect(() => {
        setMenuItems(sidebarItems);
    }, [sidebarItems]);

    return {
        menuItems,
        profileSubMenuLinks,
        setMenuItems,
    }
}

export default useDynamicSidebarMenu;