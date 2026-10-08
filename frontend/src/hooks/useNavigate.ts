import { useNavigate as useNav } from 'react-router';

enum RouteURL {
    HOME = '/',
    WILD_CARD = '*',
    QUARTER_COMPLETION = '/quarter-completion',
    QUARTER_COMPLETION_PROJECTS = '/quarter-completion/projects',
    QUARTER_COMPLETION_QUARTERS = '/quarter-completion/quarters',
    DASHBOARD = '/dashboard',
    CREW = '/crew',
    PROJECTS_ALL = '/projects',
    PROJECTS = '/projects/:projectCode',
    PROJECTS_FORMS = '/projects/:projectCode/forms',
    MISSION_CONTROL = '/mission-control',
    MISSION_CONTROL_OVERVIEW = '/mission-control/overview',
    MISSION_CONTROL_OFFICE = '/mission-control/office',
    MISSION_CONTROL_ACCOUNT = '/mission-control/account',
    MISSION_CONTROL_RECRUITMENT = '/mission-control/recruitment',
    PROJECT_WIZARD = '/project-wizard',
    PROJECT_CREATING = '/project-creating',
    LOGIN = '/login',
    ORGANIZATION_INVALID = '/organization-invalid',
    SIGN_UP = '/sign-up',
    RESEND_EMAIL = '/resend-email',
    ONBOARDING = '/onboarding',
    ADDRESS_MANAGEMENT = '/address-management',
    ADDRESS_MANAGEMENT_HEATMAP = '/address-management/heatmap',
    ADDRESS_MANAGEMENT_MANAGE_AUDIENCE = '/address-management/manage-audience',
    ADDRESS_MANAGEMENT_FILTER_ADDRESSES = '/address-management/filter-addresses',
    ADDRESS_MANAGEMENT_ADDRESS_SET_SUMMARY = '/address-management/address-set-summary',
    ADDRESS_MANAGEMENT_ADDRESS_SET_STATUS = '/address-management/address-set-status',
    ADDRESS_MANAGEMENT_APPLY_ADDRESS_SET = '/address-management/apply-address-set',
}

const useNavigate = () => {
    const nav = useNav();

    const navigate = (path: keyof typeof RouteURL) => {
        nav(RouteURL[path]);
    }
    return {
        navigate
    }
}

export default useNavigate;
export { RouteURL };