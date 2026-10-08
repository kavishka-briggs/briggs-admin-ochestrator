import { useState } from "react";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import useNavigate from "../../hooks/useNavigate";
import { logger } from "../../utils/logging";

type QuickActionType = 'manage_project' | 'manage_crew' | 'start_fundraising' | 'export_results';

const Dashboard = () => {
    const { DASHBOARD_BASIC_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);
    const { navigate } = useNavigate();

    logger('page_view', { page: 'Dashboard' });

    const handleQuickActionSelect = (action: QuickActionType) => {
        switch (action) {
            case 'manage_project':
                navigate('PROJECTS_ALL');
                break;
            case 'manage_crew':
                navigate('CREW');
                break;
            case 'export_results':
                navigate('PROJECTS_ALL');
                break;
            default:
                break;
        }
    }

    return (
        <Layout
            loading={loading}>
            <div className='p-4'>
                <RemoteComponentLoader
                    remoteUrl={DASHBOARD_BASIC_MODULE_REMOTE_URL}
                    scope="BasicDashboard"
                    modulePath="./DashboardPage"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                    componentProps={{
                        onQuickActionSelect: (action: QuickActionType) => { handleQuickActionSelect(action) }
                    }}
                />
            </div >
        </Layout>
    )
}

export default Dashboard;
