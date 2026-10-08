# React Module Architecture Principles and Best Practices

This document outlines the architecture principles and coding best practices for React modules within the Briggs System ecosystem. These guidelines ensure consistency, maintainability, and scalability across React microfrontend repositories using module federation.

## Project Structure and Organization

### Microfrontend Architecture Pattern

Follow a clean, modular architecture with clear separation of concerns for React modules:

```
project-root/
├── frontend/                # React module root
│   ├── src/
│   │   ├── api/            # API layer and service calls
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Layout/     # Layout components
│   │   │   └── Common/     # Shared components
│   │   ├── pages/          # Page-level components (federation entry points)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand state management
│   │   ├── utils/          # Utility functions and helpers
│   │   │   ├── apiClient.ts    # Axios client configuration
│   │   │   ├── logging.ts      # Logging utilities
│   │   │   └── userContext.ts  # User context utilities
│   │   ├── types/          # TypeScript type definitions
│   │   ├── config/         # Configuration files
│   │   ├── i18n/           # Internationalization setup
│   │   └── tokens/         # Design system tokens
│   ├── public/
│   │   └── locales/        # Translation files
│   ├── package.json        # Dependencies and scripts
│   ├── vite.config.ts      # Vite and federation configuration
│   ├── Dockerfile          # Container configuration
│   └── tsconfig.json       # TypeScript configuration
└── config.json             # Module configuration
```

### Key Architectural Principles

1. **Module Independence**: Each module works independently and can be deployed separately
2. **Federation Ready**: Modules expose entry points for consumption by other modules
3. **Design System Consistency**: All modules import and use the Briggs Design System
4. **State Isolation**: Each module manages its own state independently
5. **Shared Authentication**: Token-based authentication shared via localStorage

## Module Federation Configuration

### Vite Federation Setup

Configure module federation to expose specific components for consumption:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "ModuleName",
      filename: "remoteEntry.js",
      exposes: {
        "./ComponentName": "./src/pages/ComponentName.tsx",
      },
      shared: ["react", "react-dom"]
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
})
```

### Entry Point Guidelines

1. **Page-Level Exports**: Expose complete page components, not individual UI elements
2. **Self-Contained**: Exported components should include all necessary dependencies
3. **Design System Integration**: Use design system components for consistent UI
4. **Error Boundaries**: Implement error boundaries for graceful failure handling

## State Management with Zustand

### Store Architecture

Use Zustand for local state management with a clean, predictable pattern:

```typescript
// stores/moduleStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ModuleState {
  data: any[]
  loading: boolean
  error: string | null
  filters: Record<string, any>
}

interface ModuleActions {
  setData: (data: any[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateFilters: (filters: Record<string, any>) => void
  reset: () => void
}

const useModuleStore = create<ModuleState & ModuleActions>()(
  persist(
    (set, get) => ({
      // State
      data: [],
      loading: false,
      error: null,
      filters: {},
      
      // Actions
      setData: (data) => set({ data }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      updateFilters: (filters) => set({ 
        filters: { ...get().filters, ...filters } 
      }),
      reset: () => set({
        data: [],
        loading: false,
        error: null,
        filters: {}
      }),
    }),
    {
      name: 'module-store',
      partialize: (state) => ({ filters: state.filters })
    }
  )
)
```

### State Sharing Guidelines

1. **Local Storage for Shared State**: Use localStorage for data that needs to be shared between modules
2. **Module-Specific Stores**: Each module maintains its own Zustand store
3. **Persistent Filters**: Persist user preferences and filters in localStorage
4. **State Isolation**: Avoid direct state sharing between modules

## Authentication Integration

### Token Management

Implement consistent token handling across all modules:

```typescript
// utils/auth.ts
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token')
}

export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token)
}

export const removeAuthToken = (): void => {
  localStorage.removeItem('token')
}

export const isAuthenticated = (): boolean => {
  const token = getAuthToken()
  if (!token) return false
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
```

### API Client Configuration

Configure Axios with authentication and error handling:

```typescript
// utils/apiClient.ts
import axios, { AxiosInstance, AxiosError } from 'axios'

export const apiClient = (): AxiosInstance => {
  const token = localStorage.getItem('token')
  
  const instance = axios.create({
    baseURL: process.env.VITE_GATEWAY_URL || 'https://gateway.domain.com',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    timeout: 10000
  })

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const currentToken = localStorage.getItem('token')
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Handle authentication failure
        localStorage.removeItem('token')
        
        // In microfrontend context: publish AuthenticationFail event
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'AuthenticationFail',
            source: 'module'
          }, '*')
        } else {
          // In isolated context: redirect to login or show fallback
          window.location.href = '/login'
        }
      }
      
      // Retry logic for server errors (500-series)
      if (error.response?.status && error.response.status >= 500) {
        return instance.request(error.config!)
      }
      
      return Promise.reject(error)
    }
  )

  return instance
}
```

## API Integration Patterns

### Service Layer Architecture

Implement a clean service layer for API interactions:

```typescript
// api/moduleService.ts
import { apiClient } from '../utils/apiClient'

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export class ModuleService {
  private client = apiClient()

  async getData(params: Record<string, any>): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/api/module/data', { params })
      return {
        data: response.data,
        success: true
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      throw error
    }
  }

  async createItem(item: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/module/items', item)
      return {
        data: response.data,
        success: true,
        message: 'Item created successfully'
      }
    } catch (error) {
      console.error('Failed to create item:', error)
      throw error
    }
  }
}

export const moduleService = new ModuleService()
```

### React Query Integration

Use React Query for efficient data fetching and caching:

```typescript
// hooks/useModuleData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { moduleService } from '../api/moduleService'

export const useModuleData = (params: Record<string, any>) => {
  return useQuery({
    queryKey: ['moduleData', params],
    queryFn: () => moduleService.getData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Retry on server errors, not client errors
      return error?.response?.status >= 500 && failureCount < 3
    }
  })
}

export const useCreateItem = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: moduleService.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleData'] })
    },
    retry: (failureCount, error: any) => {
      return error?.response?.status >= 500 && failureCount < 2
    }
  })
}
```

## Component Architecture

### Design System Integration

Leverage the Briggs Design System for consistent UI components:

```typescript
// components/DataTable.tsx
import React from 'react'
import { 
  Table, 
  TableColumn, 
  Pagination, 
  Spinner,
  PageHeader 
} from '@briggs-walker/briggsdesignsystem'

interface DataTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }
}

export const DataTable = <T,>({ 
  data, 
  columns, 
  loading = false,
  pagination 
}: DataTableProps<T>) => {
  if (loading) {
    return <Spinner size="large" />
  }

  return (
    <div className="space-y-4">
      <Table
        data={data}
        columns={columns}
        emptyMessage="No data available"
      />
      
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  )
}
```

### Layout Components

Create consistent layout components using the design system:

```typescript
// components/Layout/Layout.tsx
import React from 'react'
import { PageHeader } from '@briggs-walker/briggsdesignsystem'

interface LayoutProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ 
  title, 
  subtitle, 
  actions, 
  children 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
      />
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

export default Layout
```

## Internationalization (i18n)

### i18next Configuration

Set up internationalization for multi-language support:

```typescript
// i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  })

export default i18n
```

### Translation Usage

Use translations consistently throughout components:

```typescript
// Example component with translations
import React from 'react'
import { useTranslation } from 'react-i18next'

const ProjectsPage: React.FC = () => {
  const { t } = useTranslation()
  
  return (
    <Layout title={t('projects.title')}>
      <div>
        <h2>{t('projects.subtitle')}</h2>
        <p>{t('projects.description')}</p>
      </div>
    </Layout>
  )
}
```

## Error Handling and Logging

### Error Boundaries

Implement error boundaries for graceful error handling:

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorPage } from '@briggs-walker/briggsdesignsystem'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Module error:', error, errorInfo)
    
    // Log to monitoring service
    this.logError(error, errorInfo)
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // Implement logging to your monitoring service
    console.error('Error logged:', { error, errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          title="Something went wrong"
          message="An unexpected error occurred. Please refresh the page."
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
```

### Logging Integration

Use the Briggs logging system for consistent logging:

```typescript
// utils/logging.ts
import { dispatch } from '@briggs-walker/briggs-logging'
import { EventName, EventProperties } from '@briggs-walker/briggs-logging/dist/types'

const moduleName = 'briggs-module-name'

export const tracker = (
  eventName: EventName, 
  eventProperties: EventProperties
): void => {
  dispatch(eventName, eventProperties, moduleName)
}

// Convenience methods
export const logPageView = (pageName: string) => {
  tracker('page_view', { page: pageName })
}

export const logUserAction = (action: string, details?: Record<string, any>) => {
  tracker('user_action', { action, ...details })
}

export const logError = (error: Error, context?: Record<string, any>) => {
  tracker('error', {
    message: error.message,
    stack: error.stack,
    ...context
  })
}
```

## Development Best Practices

### TypeScript Configuration

Use strict TypeScript configuration for type safety:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### Code Organization Guidelines

1. **Feature-Based Structure**: Organize code by features rather than file types
2. **Barrel Exports**: Use index files to create clean import paths
3. **Custom Hooks**: Extract reusable logic into custom hooks
4. **Type Safety**: Define interfaces for all data structures
5. **Component Props**: Use TypeScript interfaces for all component props

### Performance Optimization

1. **Lazy Loading**: Use React.lazy for code splitting
2. **Memoization**: Use React.memo and useMemo appropriately
3. **Virtual Scrolling**: Implement for large data sets
4. **Image Optimization**: Use appropriate image formats and sizes
5. **Bundle Analysis**: Regular analysis of bundle size

### Testing Strategy

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test component interactions
3. **API Mocking**: Mock API calls for reliable testing
4. **Accessibility Testing**: Ensure components are accessible
5. **Visual Regression**: Test UI consistency

## Deployment and Containerization

### Docker Configuration

Configure Docker for consistent deployment:

```dockerfile
# Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Configuration

Use environment-specific configurations:

```typescript
// config/environment.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.default.com',
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'https://gateway.default.com',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  environment: import.meta.env.MODE || 'development'
}
```

## Security Best Practices

1. **Token Security**: Store tokens securely and implement proper expiration handling
2. **Input Validation**: Validate all user inputs
3. **XSS Prevention**: Use React's built-in XSS protection
4. **CSRF Protection**: Implement CSRF tokens for state-changing operations
5. **Content Security Policy**: Configure CSP headers
6. **Dependency Security**: Regular security audits of dependencies

This architecture ensures that React modules are built consistently, maintain independence, integrate seamlessly with the Briggs Design System, and provide a robust foundation for scalable microfrontend applications.
