import { Spinner } from "@briggs-walker/briggsdesignsystem";
import RemoteComponentLoader from "../../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../../hooks/useGetDynamicURL";
import useNavigate, { RouteURL } from "../../../hooks/useNavigate";
import { useKeycloakStore, useUserStore } from "../../../store/userStore";
import AccountCreatingPage from "../AccountCreating/AccountCreatingPage";
import Auth from "../../Auth/Auth";
import LoadingScreen from "../../../components/Layout/LoadingScreen/LoadingScreen";
import { logger } from "../../../utils/logging";

interface OnboardingPageProps {
    onSuccess: () => void
};

const OnboardingPage = () => {
    const { ONBOARDING_MODULE_REMOTE_URL } = useGetDynamicURL();
    const { user } = useUserStore();
    const { isKeycloakRefreshed } = useKeycloakStore();
    const { navigate } = useNavigate();

    const handleOnboardingSuccess = (): void => {
        window.location.href = RouteURL.PROJECT_WIZARD;
    }

    logger('page_view', { page: 'OnboardingPage' });

    if (user?.status === 'authenticated') {
        navigate('DASHBOARD');
    }

    return (
        <div className='p-0'>
            <Auth />
            {isKeycloakRefreshed ?
                <>
                    {user?.status === "organization-create-pending" ?
                        <AccountCreatingPage />
                        :
                        <RemoteComponentLoader<OnboardingPageProps>
                            remoteUrl={ONBOARDING_MODULE_REMOTE_URL}
                            scope="Onboarding"
                            modulePath="./OnboardingPage"
                            fallback={<LoadingScreen />}
                            componentProps={{
                                onSuccess: handleOnboardingSuccess
                            }}
                        />
                    }
                </>
                :
                <div className="w-full h-[100dvh] bg-layout-loader-bg flex justify-center items-center">
                    <Spinner />
                </div>
            }
        </div >
    )
}

export default OnboardingPage;
