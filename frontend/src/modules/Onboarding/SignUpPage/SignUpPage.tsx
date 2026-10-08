import LoadingScreen from "../../../components/Layout/LoadingScreen/LoadingScreen";
import RemoteComponentLoader from "../../../components/RemoteComponentLoader/RemoteComponentLoader";
import { SIGNUP_ENABLED } from "../../../config";
import { useGetDynamicURL } from "../../../hooks/useGetDynamicURL";
import { logger } from "../../../utils/logging";

const SignUpPage = () => {
    const { ONBOARDING_MODULE_REMOTE_URL } = useGetDynamicURL();

    logger('page_view', { page: 'SignUpPage' });

    return (
        <div className='p-0'>
            <RemoteComponentLoader
                remoteUrl={ONBOARDING_MODULE_REMOTE_URL}
                scope="Onboarding"
                modulePath="./SignUpPage"
                fallback={<LoadingScreen />}
                componentProps={{ login_Route: '/login', signupEnabled: SIGNUP_ENABLED }}
            />
        </div>
    )
}

export default SignUpPage;
