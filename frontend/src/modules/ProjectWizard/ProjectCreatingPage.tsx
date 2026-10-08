import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import useNavigate from "../../hooks/useNavigate";
import { logger } from "../../utils/logging";
import Auth from "../Auth/Auth";

interface AccountCreatingPageProps {
    onSuccess: () => void
};

const ProjectCreatingPage = () => {
    const { PROJECT_WIZARD_MODULE_REMOTE_URL } = useGetDynamicURL();
    const { navigate } = useNavigate()

    logger('page_view', { page: 'ProjectCreatingPage' });

    const handleOnSuccess = (): void => {
        navigate("LOGIN");
    }

    return (
        <div className='p-0'>
            <Auth />
            <RemoteComponentLoader<AccountCreatingPageProps>
                remoteUrl={PROJECT_WIZARD_MODULE_REMOTE_URL}
                scope="ProjectWizard"
                modulePath="./ProjectCreatingPage"
                fallback={<></>}
                componentProps={{
                    onSuccess: handleOnSuccess,
                }}
            />
        </div >
    )
}

export default ProjectCreatingPage;
