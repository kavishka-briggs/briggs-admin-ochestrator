import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ModuleKey } from '../types';

export interface DynamicModule {
    pluginID: ModuleKey;
    pluginURL: string;
    gatewayPath: string;
}

interface DynamicModuleState {
    pluginsFetched: boolean;
    modules: DynamicModule[];
    setModules: (modules: DynamicModule[]) => void;
    clearModules: () => void;
    setPluginsFetched: (status: boolean) => void;
}

export const useDynamicModuleStore = create<DynamicModuleState>()(
    persist(
        (set) => ({
            pluginsFetched: false,
            modules: [],
            setModules: (modules) => set((_) => ({ modules: modules })),
            clearModules: () => set((_) => ({ modules: [] })),
            setPluginsFetched: (status) => set((_) => ({ pluginsFetched: status })),
        }),
        {
            name: 'dynamic-module-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);