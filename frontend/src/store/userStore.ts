import { AuthStatus } from 'Auth/AuthenticatorModule';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface User {
    status: AuthStatus;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    token: string;
    preferredLanguage: string;
    primaryAgencyOffice: string;
    primaryAgencyDomain: string;
    primaryGlobalDomain: string;
    primaryGlobalOffice: string;
}

interface UserState {
    user: User | null | undefined;
    setUser: (tokenUser: Partial<User>) => void;
    setUserPreferredLanguage: (lang: string) => void;
    clearUser: () => void;
}

const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: undefined,
            setUser: (tokenUser) =>
                set((state) => ({
                    user: state.user
                        ? { ...state.user, ...tokenUser }
                        : { ...tokenUser } as User,
                })),
            clearUser: () => set((_) => ({ user: null })),
            setUserPreferredLanguage: (lang) =>
                set((state) =>
                    state.user
                        ? { user: { ...state.user, preferredLanguage: lang } }
                        : {}
                ),
        }),
        {
            name: 'user-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

interface KeycloakState {
    isKeycloakRefreshed: boolean;
    setIsKeycloakRefreshed: (status: boolean) => void;
}


const useKeycloakStore = create<KeycloakState>()(
    (set) => ({
        isKeycloakRefreshed: false,
        setIsKeycloakRefreshed: (status) => set((_) => ({ isKeycloakRefreshed: status })),
    }),
);

export {
    useUserStore,
    useKeycloakStore,
}