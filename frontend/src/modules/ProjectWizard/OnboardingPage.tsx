import { Spinner } from "@briggs-walker/briggsdesignsystem";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import useNavigate from "../../hooks/useNavigate";
import { useKeycloakStore, useUserStore } from "../../store/userStore";
import Auth from "../Auth/Auth";
import LoadingScreen from "../../components/Layout/LoadingScreen/LoadingScreen";
import { logger } from "../../utils/logging";

interface OnboardingPageProps {
    onSkipButtonClick?: () => void;
    onProjectCreateSuccess?: () => void;
}

const OnboardingPage = () => {
    const { PROJECT_WIZARD_MODULE_REMOTE_URL } = useGetDynamicURL();
    const { navigate } = useNavigate();
    const { user } = useUserStore();
    const { isKeycloakRefreshed } = useKeycloakStore();


    const handleSkipButtonClick = (): void => {
        navigate("LOGIN");
    }

    const handleGetStartedButtonClick = (): void => {
        navigate("PROJECT_CREATING");
    }

    logger('page_view', { page: 'OnboardingPage' });

    return (
        <div className='p-0'>
            <Auth />
            {isKeycloakRefreshed && user?.status === 'authenticated' ?

                <RemoteComponentLoader<OnboardingPageProps>
                    remoteUrl={PROJECT_WIZARD_MODULE_REMOTE_URL}
                    scope="ProjectWizard"
                    modulePath="./OnboardingPage"
                    fallback={<LoadingScreen />}
                    componentProps={{
                        onSkipButtonClick: handleSkipButtonClick,
                        onProjectCreateSuccess: handleGetStartedButtonClick
                    }}
                />
                :
                <div className="w-full h-[100dvh] bg-layout-loader-bg flex justify-center items-center">
                    <Spinner />
                </div>
            }
        </div >
    )
}

export default OnboardingPage;
