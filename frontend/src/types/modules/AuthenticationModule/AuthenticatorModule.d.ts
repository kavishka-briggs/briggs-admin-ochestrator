declare module "Auth/AuthenticatorModule" {
    import { FC } from "react";

    type AuthStatus = "loading" | "authenticated" | "failed" | "token-expired";

    export interface KeycloakObject {
        status: AuthStatus;
        token?: string;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        email?: string;
    }

    interface AuthProps {
        onAuthStatus?: (status: KeycloakObject) => void;
    }

    const AuthenticatorModule: FC<AuthProps>;

    export default AuthenticatorModule;
    export type { AuthStatus };
}