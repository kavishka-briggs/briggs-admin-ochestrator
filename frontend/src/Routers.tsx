import { lazy, Suspense, useMemo, FC, LazyExoticComponent } from 'react';
import { Routes, Route } from 'react-router';
import { RouteURL } from './hooks/useNavigate';
import OrganizationInvalid from './modules/Auth/OrganizationInvalid';
import ModulesNotFound from './modules/Auth/ModulesNotFound';
import SignUpPage from './modules/Onboarding/SignUpPage/SignUpPage';
import LoginPage from './pages/LoginPage/LoginPage';
import OnboardingPage from './modules/Onboarding/OnboardingPage/OnboardingPage';
import ProjectsWizard from './modules/ProjectWizard/OnboardingPage';
import { useDynamicModuleStore } from './store/dynamicModuleStore';
import ProjectCreatingPage from './modules/ProjectWizard/ProjectCreatingPage';
import AddressManagement_HeatMap from './modules/AddressManagement/HeatMap';
import AddressManagement_CreateAddressSet from './modules/AddressManagement/CreateAddressSet';
import AddressManagement_FilterAddresses from './modules/AddressManagement/FilterAddresses';
import AddressManagement_AddressSetSummary from './modules/AddressManagement/AddressSetSummary';
import AddressManagement_AddressSetStatus from './modules/AddressManagement/AddressSetStatus';
import AddressManagement_ApplyAddressSet from './modules/AddressManagement/ApplyAddressSet';

const QuarterCompletion_Projects = lazy(() => import('./modules/QuarterCompletion/Projects/Projects'));
const QuarterCompletion_Quarters = lazy(() => import('./modules/QuarterCompletion/Quarters/Quarters'));
const ProjectsBasic = lazy(() => import('./modules/ProjectBasic/ProjectPage'));
const ProjectsBasic_AllProjects = lazy(() => import('./modules/ProjectBasic/AllProjectsPage'));
const ProjectsBasic_ProjectFormsPage = lazy(() => import('./modules/ProjectBasic/ProjectFormsPage'));
const MissionControl = lazy(() => import('./modules/MissionControl/MissionControlPage'));
const Dashboard = lazy(() => import('./modules/Dashboard/Dashboard'));
const Crew = lazy(() => import('./modules/Crew/Crew'));
const AddressManagement = lazy(() => import('./modules/AddressManagement/AddressManagement'));

type LoadableComponent = LazyExoticComponent<FC> | FC;

const pluginHomeMap: Record<string, LoadableComponent> = {
    'module-quartercompletion': QuarterCompletion_Projects,
    'module-crewbasic': Crew,
    'module-dashboardbasic': Dashboard,
    'module-projectbasic': ProjectsBasic,
    'module-missioncontrol': MissionControl,
    'briggs-address-module': AddressManagement,
};

const Routers: FC = () => {
    const { modules } = useDynamicModuleStore();

    const HomeComponent = useMemo<LoadableComponent>(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === "1";
        if (!isLoggedIn) {
            return SignUpPage;
        }
        const pluginId = modules[0]?.pluginID;
        if (pluginId) {
            return pluginHomeMap[pluginId];
        }
        else {
            return ModulesNotFound; // ModulesNotFound will be selected if there are no active plugins/modules for the organization (Check useGetDynamicPlugins.tsx for logic)
        }
    }, [modules]);

    const routes = [
        // Home / wildcard
        { path: RouteURL.HOME, element: <HomeComponent /> },
        { path: RouteURL.WILD_CARD, element: <HomeComponent /> },

        // Auth
        { path: RouteURL.LOGIN, element: <LoginPage /> },
        { path: RouteURL.ORGANIZATION_INVALID, element: <OrganizationInvalid /> },

        // Onboarding
        { path: RouteURL.SIGN_UP, element: <SignUpPage /> },
        { path: RouteURL.ONBOARDING, element: <OnboardingPage /> },

        // Project wizard
        { path: RouteURL.PROJECT_WIZARD, element: <ProjectsWizard /> },
        { path: RouteURL.PROJECT_CREATING, element: <ProjectCreatingPage /> },

        // Quarter completion
        { path: RouteURL.QUARTER_COMPLETION, element: <QuarterCompletion_Projects /> },
        { path: RouteURL.QUARTER_COMPLETION_PROJECTS, element: <QuarterCompletion_Projects /> },
        { path: RouteURL.QUARTER_COMPLETION_QUARTERS, element: <QuarterCompletion_Quarters /> },

        // Dashboard
        { path: RouteURL.DASHBOARD, element: <Dashboard /> },

        // Crew
        { path: RouteURL.CREW, element: <Crew /> },

        // Project basic
        { path: RouteURL.PROJECTS, element: <ProjectsBasic /> },
        { path: RouteURL.PROJECTS_ALL, element: <ProjectsBasic_AllProjects /> },
        { path: RouteURL.PROJECTS_FORMS, element: <ProjectsBasic_ProjectFormsPage /> },

        // Mission Control (splat keeps the MFE mounted across Overview/Office/Account/Recruitment)
        { path: `${RouteURL.MISSION_CONTROL}/*`, element: <MissionControl /> },

        // Address Management
        { path: RouteURL.ADDRESS_MANAGEMENT, element: <AddressManagement /> },
        { path: RouteURL.ADDRESS_MANAGEMENT_HEATMAP, element: <AddressManagement_HeatMap /> },
        { path: RouteURL.ADDRESS_MANAGEMENT_MANAGE_AUDIENCE, element: <AddressManagement_CreateAddressSet /> },
        { path: RouteURL.ADDRESS_MANAGEMENT_FILTER_ADDRESSES, element: <AddressManagement_FilterAddresses /> },
        { path: RouteURL.ADDRESS_MANAGEMENT_ADDRESS_SET_SUMMARY, element: <AddressManagement_AddressSetSummary /> },
        { path: RouteURL.ADDRESS_MANAGEMENT_ADDRESS_SET_STATUS, element: <AddressManagement_AddressSetStatus /> },
        { path: RouteURL.ADDRESS_MANAGEMENT_APPLY_ADDRESS_SET, element: <AddressManagement_ApplyAddressSet /> },
    ] as const;

    return (
        <Suspense>
            <Routes>
                {routes.map(({ path, element }) => (
                    <Route key={path} path={path} element={element} />
                ))}
            </Routes>
        </Suspense>
    );
};

export default Routers;
