import { KeycloakObject } from 'Auth/AuthenticatorModule';
import Auth from '../../modules/Auth/Auth';
import { Spinner } from '@briggs-walker/briggsdesignsystem';
import useNavigate from '../../hooks/useNavigate';

const LoginPage = () => {
    const { navigate } = useNavigate();

    const handleAuthStatusUpdate = (auth: KeycloakObject): void => {
        console.log("==================================");
        console.log("Auth Status:", auth.status);
        console.log("==================================");
        if (auth.status === "authenticated") {
            navigate('HOME'); // if there are no active plugins/modules for organization, this will redirect to SIGN_UP(check Routers.tsx for the logic. Home component is decided based on active plugins/modules)
            return
        }
        navigate('SIGN_UP');
    }

    return (
        <>
            <Auth onAuthStatus={handleAuthStatusUpdate} />
            <div className="w-full h-[100dvh] bg-layout-loader-bg flex justify-center items-center">
                <Spinner />
            </div>
        </>
    )
}

export default LoginPage;