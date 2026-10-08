import RemoteComponentLoader from '../../components/RemoteComponentLoader/RemoteComponentLoader';
import { useKeycloakStore, useUserStore } from '../../store/userStore';
import { KeycloakObject } from 'Auth/AuthenticatorModule';
import { useGetDynamicURL } from '../../hooks/useGetDynamicURL';
import useNavigate from '../../hooks/useNavigate';
import { useGetDynamicPlugins } from '../../hooks/useGetDynamicPlugins';
import { logger } from '../../utils/logging';
import useTranslation, { LanguageCode } from '../../hooks/useTranslation.hooks';
import LoadingScreen from '../../components/Layout/LoadingScreen/LoadingScreen';

const Auth = ({ onAuthStatus }: { onAuthStatus?: (auth: KeycloakObject) => void }) => {
    const { changeLanguage } = useTranslation();
    const { setUser } = useUserStore();
    const { navigate } = useNavigate();
    const { AUTH_MODULE_REMOTE_URL } = useGetDynamicURL();
    const { fetchDynamicPlugins } = useGetDynamicPlugins();
    const { setIsKeycloakRefreshed } = useKeycloakStore();

    interface RemoteAuthPageProps {
        onAuthStatus?: (auth: KeycloakObject) => void;
    }

    const handleAuthStatusUpdate = async (auth: KeycloakObject) => {
        localStorage.setItem('token', auth.token || '');
        setUser({ status: auth.status || "" });
        setIsKeycloakRefreshed(true);

        const preferredLanguage = (auth.preferredLanguage as LanguageCode) || "en-GB";
        const storedLanguage = localStorage.getItem("preferredLanguage") as LanguageCode | null;

        if (!storedLanguage || !["en-GB", "en", "nl", "es", "it", "fr", "de", "pt"].includes(storedLanguage)) {
            localStorage.setItem("preferredLanguage", preferredLanguage);
            changeLanguage(preferredLanguage);
        } else {
            changeLanguage(storedLanguage);
        }

        if (auth.status === "authenticated" || auth.status === "token-refreshed") {
            try {
                await fetchDynamicPlugins();
            } catch (error) {
                console.error("Failed to fetch dynamic plugins:", error);
                logger("user_login", [{ action: "Dynamic plugin fetch failed" }, { error: error }]);
            }
            if (auth.status === "authenticated") {
                logger("interaction", [{ action: "new_session_created" }]);
            }

            setUser(
                {
                    status: auth.status ?? "",
                    email: auth.email ?? "",
                    token: auth.token ?? "",
                    firstName: auth.firstName ?? "",
                    lastName: auth.lastName ?? "",
                    displayName: auth.displayName ?? "",
                    preferredLanguage: preferredLanguage,
                    primaryAgencyOffice: auth.primaryAgencyOffice ?? "",
                    primaryAgencyDomain: auth.primaryAgencyDomain ?? "",
                    primaryGlobalOffice: auth.primaryGlobalOffice ?? "",
                    primaryGlobalDomain: auth.primaryGlobalDomain ?? "",
                }
            )
        }
        if (auth.status === "token-refreshed") {
            setUser(
                {
                    token: auth.token,
                    status: 'authenticated',
                }
            )
            auth.status = "authenticated";
        }

        if (auth.status === "organization-invalid") {
            logger("user_login", [{ action: "Organization invalid for user, redirecting to organization invalid page" }]);
            navigate('ORGANIZATION_INVALID');
            return;
        }

        if (auth.status === "organization-not-created") {
            logger("user_login", [{ action: "Organization not created for user, redirecting to onboarding" }]);
            logger("user_login", [{ action: `${auth.email} user started onboarding flow.` }]);
            navigate('ONBOARDING');
            return;
        }

        if (auth.status === "organization-create-pending") {
            logger("user_login", [{ action: "Organization create pending for user, redirecting to onboarding loading screen" }]);
            navigate('ONBOARDING');
            return;
        }

        onAuthStatus?.(auth);
    };

    return (
        <RemoteComponentLoader<RemoteAuthPageProps>
            remoteUrl={AUTH_MODULE_REMOTE_URL}
            scope="Auth"
            modulePath="./AuthenticatorModule"
            fallback={<LoadingScreen />}
            componentProps={{
                onAuthStatus: handleAuthStatusUpdate
            }}
        />
    )
}

export default Auth;