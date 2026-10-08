import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import { useUserStore } from '../store/userStore';

const DEFAULT_LANGUAGE = localStorage.getItem('preferredLanguage') || 'en-GB';

const preferredLanguage = useUserStore.getState().user?.preferredLanguage ?? DEFAULT_LANGUAGE;

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        ns: [
            "orchestrator",
            "module_onboarding",
            "module_projectWizard",
            "module_dashboardBasic",
            "module_projectBasic",
            "module_crewBasic",
            "module_quarterCompletion",
            "module_addressPool"],
        defaultNS: "orchestrator",
        backend: {
            loadPath: "/locales/{{ns}}/{{lng}}.json",
        },
        lng: preferredLanguage,
        fallbackLng: DEFAULT_LANGUAGE,
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
