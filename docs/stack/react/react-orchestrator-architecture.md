# React Orchestrator Architecture Principles and Best Practices

**Quick Navigation:**
- **Basic Config & Commands**: See `react-quick-reference.md` for React patterns
- **Module Federation**: See `common-patterns.md` for federation patterns
- **Frontend Issues**: See `troubleshooting.md` for React/Vite problems

This document outlines the architecture principles and coding best practices for the React Orchestrator application within the Briggs System ecosystem. The Orchestrator serves as the main shell application that coordinates and hosts various microfrontends using module federation.

## Project Structure and Organization

### Orchestrator Shell Architecture

The React Orchestrator follows a microfrontend shell pattern with dynamic module loading:

```
project-root/
├── config.json              # Plugin configuration and metadata
├── frontend/                 # React orchestrator shell
│   ├── src/
│   │   ├── api/             # Gateway API communication layer
│   │   ├── components/      # Shared UI components
│   │   │   ├── Layout/      # Main application layout
│   │   │   │   └── Sidebar/ # Dynamic navigation sidebar
│   │   │   ├── RemoteComponentLoader/ # Module federation loader
│   │   │   └── ProjectWizardProgress/ # Wizard navigation
│   │   ├── pages/           # Core orchestrator pages
│   │   │   └── LoginPage/   # Authentication entry point
│   │   ├── modules/         # Local modules and fallbacks
│   │   │   ├── Auth/        # Authentication flows
│   │   │   ├── Onboarding/  # User onboarding process
│   │   │   ├── ProjectWizard/ # Project creation wizard
│   │   │   ├── Dashboard/   # Default dashboard module
│   │   │   ├── Crew/        # Crew management module
│   │   │   ├── ProjectBasic/ # Basic project management
│   │   │   └── QuarterCompletion/ # Quarter tracking
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useDynamicSidebarMenu.hooks.ts # Dynamic navigation
│   │   │   ├── useGetDynamicPlugins.tsx # Plugin discovery
│   │   │   └── useGetDynamicURL.ts # URL generation
│   │   ├── store/           # Zustand state management
│   │   │   ├── dynamicModuleStore.ts # Module registry
│   │   │   ├── sidebarStore.ts # Navigation state
│   │   │   └── userStore.ts # User session state
│   │   ├── utils/           # Utility functions
│   │   │   ├── apiClient.ts # Axios HTTP client
│   │   │   ├── loadRemote.ts # Module federation utilities
│   │   │   └── logging.ts   # Centralized logging
│   │   ├── types/           # TypeScript definitions
│   │   │   └── modules/     # Module-specific type definitions
│   │   ├── config/          # Configuration management
│   │   ├── i18n/            # Internationalization setup
│   │   └── tokens/          # Design system token overrides
│   ├── public/
│   │   ├── config-orch.js   # Runtime configuration
│   │   └── locales/         # Translation files
│   ├── vite.config.ts       # Vite and federation configuration
│   ├── Dockerfile           # Container configuration
│   └── package.json         # Dependencies and scripts
└── helm/                    # Kubernetes deployment configuration
    ├── Chart.yaml
    ├── values-dev.yaml
    └── templates/
```

### Key Architectural Principles

1. **Shell Pattern**: Acts as the main container for all microfrontends
2. **Dynamic Module Discovery**: Modules are discovered and loaded at runtime
3. **Federation Host**: Coordinates module federation and shared dependencies
4. **Centralized Authentication**: Manages auth tokens and user sessions
5. **Progressive Enhancement**: Graceful degradation when modules are unavailable
6. **Domain-Driven Navigation**: Sidebar and routing adapt to user's domain permissions

## Module Federation Configuration

### Vite Federation Setup

The Orchestrator is configured as a federation host that dynamically loads remote modules:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(), 
    federation({
      name: 'Orchestrator',
      remotes: {
        // Dynamic remotes loaded at runtime
        Remote: "",
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  }
})
```

### Dynamic Module Loading

The Orchestrator dynamically discovers and loads modules based on user permissions and domain configuration:

```typescript
// hooks/useGetDynamicPlugins.tsx pattern
export const useGetDynamicPlugins = () => {
    const { setModules, setPluginsFetched } = useDynamicModuleStore();
    const { setSidebarItems } = useSidebarStore();

    const fetchDynamicPlugins = async () => {
        // 1. Fetch active plugins from API Gateway
        const plugins = await getActivePlugins();
        
        // 2. Sort by plugin index and filter allowed modules
        const sortedPlugins = [...plugins]
            .sort((a, b) => (a.plugin_index ?? 0) - (b.plugin_index ?? 0))
            .filter(plugin => allowedModules.includes(plugin.id));
        
        // 3. Generate plugin URLs for federation
        let pluginURLs: DynamicModule[] = [];
        sortedPlugins.forEach((plugin) => {
            pluginURLs.push({
                pluginID: plugin.id as ModuleKey,
                pluginURL: MICRO_FRONTEND_HOSTED_URL.replace("mfe", plugin.id),
                gatewayPath: plugin.gateway_path,
            });
        });
        
        // 4. Update state and navigation
        setModules(pluginURLs);
        setPluginsFetched(true);
    }
}
```

## State Management with Zustand

### Orchestrator State Architecture

The Orchestrator uses Zustand for managing application-wide state with persistence:

```typescript
// store/dynamicModuleStore.ts
export interface DynamicModule {
    pluginID: ModuleKey;
    pluginURL: string;
    gatewayPath: string;
}

interface DynamicModuleState {
    pluginsFetched: boolean;
    modules: DynamicModule[];
    setModules: (modules: DynamicModule[]) => void;
    setPluginsFetched: (status: boolean) => void;
}

export const useDynamicModuleStore = create<DynamicModuleState>()(
    persist(
        (set) => ({
            pluginsFetched: false,
            modules: [],
            setModules: (modules) => set(() => ({ modules })),
            setPluginsFetched: (status) => set(() => ({ pluginsFetched: status })),
        }),
        {
            name: 'dynamic-module-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
```

### State Management Guidelines

1. **Persist Critical State**: Module configurations and user sessions
2. **Atomic Updates**: Use functional updates for state modifications
3. **Store Separation**: Separate stores for different concerns (modules, sidebar, user)
4. **Type Safety**: Full TypeScript integration with strict typing

## API Integration and Gateway Communication

### Centralized API Client

All communication with the Krakend API Gateway flows through a centralized client:

```typescript
// utils/apiClient.ts
export const apiClient = (): AxiosInstance => {
    const token = localStorage.getItem("token");
    
    const instance = axios.create({
        baseURL: GATEWAY_URL,
        headers: {
            Authorization: `Bearer ${token}`
        },
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            // Handle authentication errors, token refresh, etc.
            return Promise.reject(error);
        }
    );

    return instance;
}
```

### API Integration Patterns

1. **Token-Based Authentication**: JWT tokens stored in localStorage
2. **Gateway-First**: All API calls route through Krakend Gateway
3. **Error Handling**: Centralized error interceptors
4. **Request/Response Transformation**: Consistent data formatting
5. **Retry Logic**: Automatic retry for transient failures

## Dynamic Routing and Navigation

### Adaptive Routing System

The Orchestrator implements dynamic routing that adapts to available modules:

```typescript
// Routers.tsx pattern
const Routers: FC = () => {
    const { modules } = useDynamicModuleStore();

    // Determine home component based on first available module
    const HomeComponent = useMemo<LoadableComponent>(() => {
        const pluginId = modules[0]?.pluginID;
        return pluginHomeMap[pluginId] ?? SignUpPage;
    }, [modules]);

    const routes = [
        // Dynamic home route
        { path: RouteURL.HOME, element: <HomeComponent /> },
        
        // Static orchestrator routes
        { path: RouteURL.LOGIN, element: <LoginPage /> },
        { path: RouteURL.ONBOARDING, element: <OnboardingPage /> },
        
        // Module-specific routes (lazy loaded)
        { path: RouteURL.QUARTER_COMPLETION, element: <QuarterCompletion_Projects /> },
        { path: RouteURL.CREW, element: <Crew /> },
        { path: RouteURL.PROJECTS, element: <ProjectsBasic /> },
    ];

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
```

### Navigation Principles

1. **Lazy Loading**: All module routes are lazy-loaded for performance
2. **Fallback Handling**: Graceful degradation when modules are unavailable
3. **Dynamic Home**: Home route adapts to user's primary module
4. **Suspense Boundaries**: Loading states for async route loading

## Component Architecture and Design System Integration

### Briggs Design System Integration

The Orchestrator heavily leverages the Briggs Design System for consistency:

```typescript
// Dependencies in package.json
"@briggs-walker/briggsdesignsystem": "^1.0.48",
"@briggs-walker/briggs-logging": "^1.0.10",
```

### Design System Usage Patterns

1. **Token Overrides**: Custom tokens for orchestrator-specific styling
2. **Component Reuse**: Extensive use of design system components
3. **Consistent Theming**: Dark/light theme support via design tokens
4. **Responsive Design**: Mobile-first responsive patterns

### Layout Component Architecture

```typescript
// components/Layout/Layout.tsx pattern
const Layout: FC = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};
```

## Internationalization (i18n) Strategy

### Multi-Language Support

The Orchestrator supports multiple languages with react-i18next:

```typescript
// i18n/index.ts setup
import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
        lng: 'en',
        fallbackLng: 'en',
        backend: {
            loadPath: '/locales/{{lng}}.json',
        },
    });
```

### Supported Languages

- English (`en`; UI locale files may include `en-GB`, but API language fields must stay ISO 639-1 `en`)
- Spanish (es)
- Italian (it)
- Dutch (nl)

### i18n Best Practices

1. **Namespace Organization**: Logical grouping of translation keys
2. **Lazy Loading**: Load translations on demand
3. **Fallback Strategy**: English as universal fallback
4. **Context-Aware**: Support for pluralization and context

## Authentication and Authorization Flow

### Token-Based Authentication

The Orchestrator manages authentication for the entire microfrontend ecosystem:

```typescript
// Authentication flow pattern
1. User logs in via LoginPage
2. JWT token stored in localStorage
3. Token included in all API requests via apiClient
4. User permissions determine available modules
5. Dynamic sidebar and routing adapt to permissions
```

### Authorization Integration

1. **Domain-Based Access**: User permissions scoped to domains
2. **Module Filtering**: Only show modules user has access to
3. **Route Protection**: Automatic redirect for unauthorized access
4. **Session Management**: Token refresh and logout handling

## Performance Optimization Strategies

### Code Splitting and Lazy Loading

```typescript
// Lazy loading pattern
const QuarterCompletion_Projects = lazy(() => 
    import('./modules/QuarterCompletion/Projects/Projects')
);
const Dashboard = lazy(() => 
    import('./modules/Dashboard/Dashboard')
);
```

### Federation Optimization

1. **Shared Dependencies**: React and React-DOM shared across modules
2. **Bundle Splitting**: Separate chunks for different concerns
3. **Preloading**: Strategic preloading of likely-needed modules
4. **Caching**: Aggressive caching of static assets

### Performance Monitoring

```typescript
// utils/logging.ts integration
import { tracker } from './utils/logging';

// Initialize tracking in App.tsx
tracker.listen();
```

## Error Handling and Resilience

### Error Boundary Strategy

```typescript
// Error boundary pattern for module loading
class ModuleFederationErrorBoundary extends Component {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log module federation errors
        // Fallback to local module or error page
    }
}
```

### Resilience Patterns

1. **Graceful Degradation**: Local fallbacks when remote modules fail
2. **Circuit Breaker**: Prevent cascading failures
3. **Retry Logic**: Automatic retry for transient network issues
4. **User Feedback**: Clear error messages and recovery options

## Development and Build Configuration

### Development Setup

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite --port 5173 --strictPort",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "tsc -b && vite build && vite preview --port 5173 --strictPort"
  }
}
```

### TypeScript Configuration

- **Strict Mode**: Full TypeScript strict mode enabled
- **Path Mapping**: Clean import paths via tsconfig
- **Module Types**: Dedicated type definitions for each module
- **Build Validation**: Type checking before build

### Containerization

```dockerfile
# Dockerfile pattern for production deployment
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Deployment and DevOps Integration

### CI/CD Pipeline

The GitHub Actions workflow (`frontend-build-dev.yaml`) handles:

1. **Automated Builds**: Triggered on frontend changes
2. **Container Registry**: Push to Azure Container Registry
3. **Cross-Repository**: Uses shared workflow from plugin-deploy
4. **Environment-Specific**: Separate configs for dev/staging/prod

### Kubernetes Deployment

```yaml
# helm/values-dev.yaml pattern
image:
  repository: orchestrator
  tag: development
  pullPolicy: Always

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  host: orchestrator-dev.briggs.com
```

## Testing Strategy

### Testing Pyramid

1. **Unit Tests**: Component and utility function testing
2. **Integration Tests**: Module federation and API integration
3. **E2E Tests**: Full user journey testing
4. **Visual Regression**: Design system consistency

### Module Federation Testing

1. **Mock Remotes**: Test with mock remote modules
2. **Fallback Testing**: Verify graceful degradation
3. **Loading States**: Test async module loading
4. **Error Scenarios**: Test federation failure handling

## Security Considerations

### Frontend Security

1. **Token Storage**: Secure token storage and transmission
2. **XSS Prevention**: Sanitization of dynamic content
3. **Content Security Policy**: Strict CSP for module loading
4. **Dependency Scanning**: Regular vulnerability scanning

### Module Federation Security

1. **Trusted Sources**: Only load modules from trusted origins
2. **Integrity Checks**: Verify module integrity before loading
3. **Sandboxing**: Isolate module execution contexts
4. **Access Control**: Module-level permission enforcement

## Monitoring and Observability

### Application Monitoring

```typescript
// Integration with Briggs logging system
import { tracker } from '@briggs-walker/briggs-logging';

// Performance tracking
tracker.trackPageView(pageName);
tracker.trackUserAction(actionType, metadata);
```

### Key Metrics

1. **Module Load Times**: Federation performance metrics
2. **Error Rates**: Module failure and fallback rates
3. **User Journeys**: Navigation and conversion tracking
4. **Performance**: Core Web Vitals and loading metrics

## Future Architecture Considerations

### Scalability Roadmap

1. **Micro-App Evolution**: Transition from modules to full micro-apps
2. **Edge Deployment**: CDN-based module distribution
3. **Progressive Web App**: Enhanced offline capabilities
4. **Real-Time Features**: WebSocket integration for live updates

### Technology Evolution

1. **Framework Agnostic**: Support for non-React modules
2. **Native Integration**: Mobile app shell capabilities
3. **AI Integration**: Intelligent module recommendations
4. **Advanced Federation**: Module versioning and rollback strategies

## Best Practices Summary

### Code Quality

1. **TypeScript First**: Strict typing throughout
2. **ESLint Integration**: Consistent code formatting
3. **Component Composition**: Prefer composition over inheritance
4. **Functional Programming**: Use hooks and functional patterns

### Architecture Patterns

1. **Separation of Concerns**: Clear layer boundaries
2. **Dependency Injection**: Prop drilling avoidance
3. **Event-Driven**: Decoupled module communication
4. **Progressive Enhancement**: Graceful feature degradation

### Performance

1. **Bundle Optimization**: Tree shaking and code splitting
2. **Lazy Loading**: Load modules on demand
3. **Caching Strategy**: Aggressive static asset caching
4. **Memory Management**: Proper cleanup and disposal

This React Orchestrator serves as the foundation for the Briggs System's microfrontend architecture, providing a robust, scalable, and maintainable platform for hosting and coordinating multiple business modules within a unified user experience.
