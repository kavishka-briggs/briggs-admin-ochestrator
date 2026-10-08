import React, { Suspense, useEffect, useState } from 'react';
import { loadRemote } from '../../utils/loadRemote';

type ModuleName = "Auth" | "QuarterCompletion" | "BasicCrew" | "BasicDashboard" | "ProjectBasic" | "ProjectWizard" | "Onboarding" | "AddressManagement" | "MissionControl";
type AuthModulePath = "./AuthenticatorModule" | "./OrganizationInvalidModule" | './ModulesNotFoundModule';
type ProjectModulePath = "./ProjectsPage" | "./QuartersPage";
type DashboardModulePath = "./DashboardPage";
type CrewModulePath = "./CrewPage";
type ProjectBasicModulePath = "./ProjectsPage" | "./AllProjectsPage" | "./ProjectFormsPage";
type ProjectWizardModulePath = "./OnboardingPage" | "./ProjectCreatingPage";
type OnboardingModulePath = "./SignUpPage" | "./OnboardingPage" | "./AccountCreatingPage";
type AddressManagementModulePath = "./AddressManagement" | "./HeatMap" | "./CreateAddressSet" | "./FilterAddresses" | "./AddressSetSummary" | "./AddressSetStatus" | "./ApplyAddressSet";
type MissionControlModulePath = "./MissionControlPage";

interface RemoteComponentLoaderProps<TProps> {
    /** URL/path pointing to the remoteEntry.js file */
    remoteUrl: string;
    /** The scope name (e.g. 'QuarterCompletion') */
    scope: ModuleName;
    /** The exposed module path in the remote (e.g. './ProjectsPage') */
    modulePath: AuthModulePath | ProjectModulePath | CrewModulePath | DashboardModulePath | ProjectBasicModulePath | ProjectWizardModulePath | OnboardingModulePath | AddressManagementModulePath | MissionControlModulePath;
    /** Fallback element while remote is being fetched */
    fallback?: React.ReactNode;
    /** Props to pass along to the remote component once loaded */
    componentProps?: TProps;
    /** Attribute to get from the module, if applicable */
    onComponentLoad?: () => void;
}

function RemoteComponentLoader<TProps>({
    remoteUrl,
    scope,
    modulePath,
    fallback = <></>,
    componentProps,
    onComponentLoad
}: RemoteComponentLoaderProps<TProps>) {
    const [RemoteComponent, setRemoteComponent] = useState<React.ComponentType<TProps> | null>(null);

    useEffect(() => {
        loadRemote(remoteUrl, scope, modulePath)
            .then((module) => {
                setRemoteComponent(() => module['default'] ? module['default'] : module);
            })
            .catch((error) => {
                console.error(`Failed to load remote component: ${scope}/${modulePath}`, error);
            }).finally(() => {
                onComponentLoad?.();
            });
    }, [remoteUrl, scope, modulePath]);

    return (
        <Suspense fallback={fallback}>

            {RemoteComponent ?
                // @ts-ignore
                <RemoteComponent {...(componentProps as TProps)} />
                : fallback}
        </Suspense>
    );
}

export default RemoteComponentLoader;
