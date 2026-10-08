import RemoteComponentLoader from "../../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../../hooks/useGetDynamicURL";
import useNavigate from "../../../hooks/useNavigate";
import { logger } from "../../../utils/logging";

const AccountCreatingPage = () => {
    const { ONBOARDING_MODULE_REMOTE_URL } = useGetDynamicURL();
    const { navigate } = useNavigate();

    const handleOnboardingSuccess = (): void => {
        navigate("LOGIN");
    }

    logger('page_view', { page: 'AccountCreating' });

    return (
        <div className='p-0'>
            <RemoteComponentLoader
                remoteUrl={ONBOARDING_MODULE_REMOTE_URL}
                scope="Onboarding"
                modulePath="./AccountCreatingPage"
                fallback={<></>}
                componentProps={{
                    onSuccess: handleOnboardingSuccess
                }}
            />
        </div>
    )
}

export default AccountCreatingPage;
