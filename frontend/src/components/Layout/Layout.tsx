import React, { ReactNode, useEffect } from 'react';
import { Spinner } from '@briggs-walker/briggsdesignsystem';
import { useKeycloakStore, useUserStore } from '../../store/userStore';
import Auth from '../../modules/Auth/Auth';
import SidebarContainer from './Sidebar/Sidebar';
import HorizontalLoadingIndicator from '../HorizontalLoadingIndicator/HorizontalLoadingIndicator';
import useNavigate from '../../hooks/useNavigate';
import ProgressButton from '../ProjectWizardProgress/ProjectWizardProgress';
import { getProjectInfo } from '../../api/api';
import useTokenBridge from '../../hooks/useTokenBridge';
interface LayoutProps { 
    children?: ReactNode;
    loading?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, loading }) => {
    const { user } = useUserStore();
    const { navigate } = useNavigate();
    const { isKeycloakRefreshed } = useKeycloakStore();
    const [showProjectWizardProgress, setShowProjectWizardProgress] = React.useState(false);

    // Bridges the auth token to embedded iframes via postMessage.
    useTokenBridge();

    const getProjects = async () => {
        const domainCode = user?.primaryGlobalDomain || "";
        const projectCount = (await getProjectInfo(domainCode));
        projectCount === -1 ? setShowProjectWizardProgress(true) : setShowProjectWizardProgress(false);
    }

    useEffect(() => {
        if (user?.status === 'organization-invalid') {
            navigate('ORGANIZATION_INVALID');
            return;
        }
        if (user?.status === 'organization-not-created') {
            navigate('ONBOARDING');
            return;
        }
        if (!localStorage.getItem('isLoggedIn')) {
            navigate('SIGN_UP');
            return;
        }
        getProjects();
    }, [user, navigate]);

    return (
        <>
            {/* Auth handles setting user object and controlling session */}
            <Auth />
            {isKeycloakRefreshed && (user?.status === 'authenticated' || user?.status === 'token-refreshed') ? (
                <div className="default-layout flex flex-row max-[800px]:flex-col h-[100dvh]">
                    <SidebarContainer />

                    {/* Main content area */}
                    <div className="flex-1 min-h-0 overflow-y-auto max-[800px]:pt-[80px] bg-layout-content-area-bg h-full">
                        {loading && <HorizontalLoadingIndicator indeterminate />}
                        {children}
                    </div>
                    {showProjectWizardProgress &&
                        <div className='w-fit fixed bottom-25 px-4'>
                            <div className='max-w-65'>
                                <ProgressButton />
                            </div>
                        </div>
                    }
                </div>
            ) : (
                <div className="w-full h-[100dvh] bg-layout-loader-bg flex justify-center items-center">
                    <Spinner />
                </div>
            )}
        </>
    );
};

export default Layout;
