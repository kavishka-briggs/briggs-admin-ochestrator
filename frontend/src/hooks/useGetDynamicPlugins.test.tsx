import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGetDynamicPlugins } from './useGetDynamicPlugins';

const mockSetModules = vi.fn();
const mockSetPluginsFetched = vi.fn();
const mockSetSidebarItems = vi.fn();
const mockSetMenuItems = vi.fn();
const mockGetActivePlugins = vi.fn();

vi.mock('../api/api', () => ({
    getActivePlugins: (...args: unknown[]) => mockGetActivePlugins(...args),
}));

vi.mock('../config', () => ({
    MICRO_FRONTEND_HOSTED_URL: 'https://mfe.example.test',
}));

vi.mock('../store/dynamicModuleStore', () => ({
    useDynamicModuleStore: () => ({
        setModules: mockSetModules,
        setPluginsFetched: mockSetPluginsFetched,
    }),
}));

vi.mock('../store/sidebarStore', () => ({
    useSidebarStore: () => ({
        setSidebarItems: mockSetSidebarItems,
    }),
}));

vi.mock('./useDynamicSidebarMenu.hooks', () => ({
    default: () => ({
        setMenuItems: mockSetMenuItems,
    }),
    pluginMap: () => ({
        'module-dashboardbasic': { id: 2, label: 'Dashboard', icon: 'home', href: '/dashboard' },
        'module-missioncontrol': { id: 7, label: 'Mission Control', icon: 'chart', href: '/mission-control/overview' },
    }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

describe('useGetDynamicPlugins', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetActivePlugins.mockResolvedValue([
            { id: 'module-missioncontrol', gateway_path: '/api/missioncontrol', plugin_index: 2 },
            { id: 'module-dashboardbasic', gateway_path: '/api/dashboard', plugin_index: 1 },
        ]);
    });

    it('loads active plugins and updates stores', async () => {
        const { result } = renderHook(() => useGetDynamicPlugins());

        await result.current.fetchDynamicPlugins();

        await waitFor(() => {
            expect(mockGetActivePlugins).toHaveBeenCalledTimes(1);
            expect(mockSetMenuItems).toHaveBeenCalled();
            expect(mockSetSidebarItems).toHaveBeenCalled();
            expect(mockSetModules).toHaveBeenCalledWith([
                {
                    pluginID: 'module-dashboardbasic',
                    pluginURL: 'https://module-dashboardbasic.example.test',
                    gatewayPath: '/api/dashboard',
                },
                {
                    pluginID: 'module-missioncontrol',
                    pluginURL: 'https://module-missioncontrol.example.test',
                    gatewayPath: '/api/missioncontrol',
                },
            ]);
            expect(mockSetPluginsFetched).toHaveBeenCalledWith(true);
        });
    });
});
