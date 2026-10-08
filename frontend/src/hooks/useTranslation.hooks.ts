
import { useTranslation as translation } from 'react-i18next';
import i18n from '../i18n';

type LanguageCode = "en-GB" | "en" | "nl" | "es" | "it" | "fr" | "de" | "pt";

const useTranslation = () => {
    const { t } = translation();

    const changeLanguage = (lang: LanguageCode): void => {
        i18n.changeLanguage(lang);
    }

    return (
        {

            t,
            changeLanguage
        }
    )
}

export default useTranslation;
export type { LanguageCode };
