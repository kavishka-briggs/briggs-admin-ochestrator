declare module "Auth/AuthenticatorModule" {
    import { FC } from "react";

    type AuthStatus =
        "loading" |
        "authenticated" |
        "token-refreshed" |
        "failed" |
        "token-expired" |
        "organization-invalid" |
        "organization-not-created" |
        "organization-create-pending";

    export interface KeycloakObject {
        status: AuthStatus;
        token?: string;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        email?: string;
        preferredLanguage?: string;
        primaryAgencyOffice?: string;
        primaryAgencyDomain?: string;
        primaryGlobalDomain?: string;
        primaryGlobalOffice?: string;
    }

    interface AuthProps {
        onAuthStatus?: (status: KeycloakObject) => void;
    }

    const AuthenticatorModule: FC<AuthProps>;

    export default AuthenticatorModule;
    export type { AuthStatus };
}