import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicPlugins } from "../../hooks/useGetDynamicPlugins";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import { RouteURL } from "../../hooks/useNavigate";
import { useDynamicModuleStore } from "../../store/dynamicModuleStore";
import { logger } from "../../utils/logging";

const MISSION_CONTROL_PLUGIN_ID = 'module-missioncontrol';

const MISSION_CONTROL_VIEWS = ['overview', 'office', 'account', 'recruitment'] as const;

export type MissionControlView = (typeof MISSION_CONTROL_VIEWS)[number];

const isMissionControlView = (value: string): value is MissionControlView =>
    (MISSION_CONTROL_VIEWS as readonly string[]).includes(value);

export const viewFromPath = (pathname: string): MissionControlView => {
    const base = RouteURL.MISSION_CONTROL.replace(/\/$/, '');
    const prefix = `${base}/`;
    if (!pathname.startsWith(prefix)) {
        return 'overview';
    }
    const segment = pathname.slice(prefix.length).split('/')[0];
    return segment && isMissionControlView(segment) ? segment : 'overview';
};

export const pathForView = (view: MissionControlView): string => {
    switch (view) {
        case 'office':
            return RouteURL.MISSION_CONTROL_OFFICE;
        case 'account':
            return RouteURL.MISSION_CONTROL_ACCOUNT;
        case 'recruitment':
            return RouteURL.MISSION_CONTROL_RECRUITMENT;
        default:
            return RouteURL.MISSION_CONTROL_OVERVIEW;
    }
};

const MissionControlPage = () => {
    const { MISSION_CONTROL_MODULE_REMOTE_URL } = useGetDynamicURL();
    const { modules, pluginsFetched } = useDynamicModuleStore();
    const { fetchDynamicPlugins } = useGetDynamicPlugins();
    const hasMissionControl = modules.some((plugin) => plugin.pluginID === MISSION_CONTROL_PLUGIN_ID);
    const gatewayPath = useDynamicModuleStore((state) =>
        state.modules.find((plugin) => plugin.pluginID === MISSION_CONTROL_PLUGIN_ID)?.gatewayPath ?? '/api/missioncontrol'
    );
    const [loading, setLoading] = useState<boolean>(true);
    const location = useLocation();
    const navigate = useNavigate();
    const view = viewFromPath(location.pathname);

    useEffect(() => {
        if (localStorage.getItem('isLoggedIn') === '1' && !pluginsFetched) {
            fetchDynamicPlugins().catch((error) => {
                console.error('Failed to fetch dynamic plugins:', error);
                logger('page_view', [{ page: 'MissionControlPage' }, { action: 'Dynamic plugin fetch failed' }, { error }]);
            });
        }
    }, [fetchDynamicPlugins, pluginsFetched]);

    useEffect(() => {
        if (pluginsFetched && !hasMissionControl) {
            navigate(RouteURL.DASHBOARD, { replace: true });
        }
    }, [pluginsFetched, hasMissionControl, navigate]);

    useEffect(() => {
        if (location.pathname === RouteURL.MISSION_CONTROL || location.pathname === `${RouteURL.MISSION_CONTROL}/`) {
            navigate(RouteURL.MISSION_CONTROL_OVERVIEW, { replace: true });
        }
    }, [location.pathname, navigate]);

    logger('page_view', { page: 'MissionControlPage', view });

    if (!pluginsFetched || !hasMissionControl) {
        return (
            <Layout loading={true}>
                <></>
            </Layout>
        );
    }

    return (
        <Layout loading={loading}>
            <div className="h-full min-h-0">
                <RemoteComponentLoader
                    remoteUrl={MISSION_CONTROL_MODULE_REMOTE_URL}
                    scope="MissionControl"
                    modulePath="./MissionControlPage"
                    fallback={<></>}
                    componentProps={{
                        gatewayPath,
                        view,
                        embedded: true,
                        onViewChange: (nextView: MissionControlView) => {
                            const path = pathForView(nextView);
                            if (path !== location.pathname) {
                                navigate(path);
                            }
                        },
                    }}
                    onComponentLoad={() => setLoading(false)}
                />
            </div>
        </Layout>
    );
};

export default MissionControlPage;
