import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import MissionControlPage, { pathForView, viewFromPath } from './MissionControlPage';
import { RouteURL } from '../../hooks/useNavigate';

const mockDynamicModuleState = {
    modules: [{ pluginID: 'module-missioncontrol', gatewayPath: '/api/missioncontrol', pluginURL: 'http://example.test' }],
    pluginsFetched: true,
};

vi.mock('../../components/Layout/Layout', () => ({
    default: ({ children, loading }: { children: React.ReactNode; loading: boolean }) => (
        <div data-testid="layout" data-loading={loading}>{children}</div>
    ),
}));

vi.mock('../../components/RemoteComponentLoader/RemoteComponentLoader', () => ({
    default: ({
        componentProps,
        onComponentLoad,
    }: {
        componentProps: {
            view: string;
            embedded: boolean;
            onViewChange: (view: string) => void;
        };
        onComponentLoad: () => void;
    }) => {
        React.useEffect(() => {
            onComponentLoad();
        }, [onComponentLoad]);

        return (
            <div data-testid="remote-mission-control">
                <span data-testid="remote-view">{componentProps.view}</span>
                <button type="button" onClick={() => componentProps.onViewChange('office')}>
                    Go office
                </button>
            </div>
        );
    },
}));

vi.mock('../../hooks/useGetDynamicURL', () => ({
    useGetDynamicURL: () => ({ MISSION_CONTROL_MODULE_REMOTE_URL: 'http://example.test/remoteEntry.js' }),
}));

const { mockFetchDynamicPlugins } = vi.hoisted(() => ({
    mockFetchDynamicPlugins: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../hooks/useGetDynamicPlugins', () => ({
    useGetDynamicPlugins: () => ({ fetchDynamicPlugins: mockFetchDynamicPlugins }),
}));

vi.mock('../../store/dynamicModuleStore', () => ({
    useDynamicModuleStore: (selector?: (state: typeof mockDynamicModuleState) => unknown) =>
        selector ? selector(mockDynamicModuleState) : mockDynamicModuleState,
}));

vi.mock('../../utils/logging', () => ({
    logger: vi.fn(),
}));

const PathProbe = () => {
    const { pathname } = useLocation();
    return <div data-testid="pathname">{pathname}</div>;
};

describe('viewFromPath', () => {
    it('returns overview for the base Mission Control route', () => {
        expect(viewFromPath(RouteURL.MISSION_CONTROL)).toBe('overview');
        expect(viewFromPath(`${RouteURL.MISSION_CONTROL}/`)).toBe('overview');
    });

    it('maps known view segments from the URL', () => {
        expect(viewFromPath(RouteURL.MISSION_CONTROL_OVERVIEW)).toBe('overview');
        expect(viewFromPath(RouteURL.MISSION_CONTROL_OFFICE)).toBe('office');
        expect(viewFromPath(RouteURL.MISSION_CONTROL_ACCOUNT)).toBe('account');
        expect(viewFromPath(RouteURL.MISSION_CONTROL_RECRUITMENT)).toBe('recruitment');
    });

    it('falls back to overview for unknown segments', () => {
        expect(viewFromPath('/mission-control/unknown')).toBe('overview');
        expect(viewFromPath('/dashboard')).toBe('overview');
    });
});

describe('pathForView', () => {
    it('maps each view to the orchestrator route constant', () => {
        expect(pathForView('overview')).toBe(RouteURL.MISSION_CONTROL_OVERVIEW);
        expect(pathForView('office')).toBe(RouteURL.MISSION_CONTROL_OFFICE);
        expect(pathForView('account')).toBe(RouteURL.MISSION_CONTROL_ACCOUNT);
        expect(pathForView('recruitment')).toBe(RouteURL.MISSION_CONTROL_RECRUITMENT);
    });
});

describe('MissionControlPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDynamicModuleState.modules = [{ pluginID: 'module-missioncontrol', gatewayPath: '/api/missioncontrol', pluginURL: 'http://example.test' }];
        mockDynamicModuleState.pluginsFetched = true;
        localStorage.removeItem('isLoggedIn');
    });

    const renderAt = (initialPath: string, extraRoutes?: React.ReactNode) =>
        render(
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    {extraRoutes}
                    <Route
                        path="/mission-control/*"
                        element={(
                            <>
                                <PathProbe />
                                <MissionControlPage />
                            </>
                        )}
                    />
                </Routes>
            </MemoryRouter>,
        );

    it('redirects bare /mission-control to overview', async () => {
        renderAt(RouteURL.MISSION_CONTROL);

        await waitFor(() => {
            expect(screen.getByTestId('pathname')).toHaveTextContent(RouteURL.MISSION_CONTROL_OVERVIEW);
        });
    });

    it('passes the current view to the embedded remote module', () => {
        renderAt(RouteURL.MISSION_CONTROL_OFFICE);
        expect(screen.getByTestId('remote-view')).toHaveTextContent('office');
    });

    it('navigates when the remote module requests a view change', async () => {
        const user = userEvent.setup();
        renderAt(RouteURL.MISSION_CONTROL_OVERVIEW);
        await user.click(screen.getByRole('button', { name: 'Go office' }));

        await waitFor(() => {
            expect(screen.getByTestId('pathname')).toHaveTextContent(RouteURL.MISSION_CONTROL_OFFICE);
        });
    });

    it('redirects to dashboard when Mission Control is not an active plugin', async () => {
        mockDynamicModuleState.modules = [];
        mockDynamicModuleState.pluginsFetched = true;

        renderAt(
            RouteURL.MISSION_CONTROL_OVERVIEW,
            <Route path={RouteURL.DASHBOARD} element={<div data-testid="dashboard">Dashboard</div>} />,
        );

        await waitFor(() => {
            expect(screen.getByTestId('dashboard')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('remote-mission-control')).not.toBeInTheDocument();
    });

    it('fetches plugins when logged in and plugins are not loaded yet', async () => {
        mockDynamicModuleState.pluginsFetched = false;
        localStorage.setItem('isLoggedIn', '1');

        renderAt(RouteURL.MISSION_CONTROL_OVERVIEW);

        await waitFor(() => {
            expect(mockFetchDynamicPlugins).toHaveBeenCalledTimes(1);
        });
    });
});
