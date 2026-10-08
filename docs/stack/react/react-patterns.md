# React Stack - Common Patterns

**CANONICAL SOURCE**: React-specific code patterns and integration examples.

## Module Federation Patterns

### Remote Module Exposure
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'ProjectsModule',
      filename: 'remoteEntry.js',
      exposes: {
        './ProjectsPage': './src/pages/ProjectsPage.tsx',
        './ProjectDetail': './src/pages/ProjectDetail.tsx'
      },
      shared: ['react', 'react-dom', 'zustand']
    })
  ]
})
```

### Module Consumption
```typescript
// orchestrator vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'Orchestrator',
      remotes: {
        projects: 'http://localhost:3000/remoteEntry.js',
        crew: 'http://localhost:3001/remoteEntry.js'
      },
      shared: ['react', 'react-dom']
    })
  ]
})

// Component usage
const ProjectsPage = React.lazy(() => import('projects/ProjectsPage'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectsPage />
    </Suspense>
  )
}
```

## Authentication Patterns

### Keycloak Integration
```typescript
// utils/auth.ts
import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
})

export const initAuth = async (): Promise<boolean> => {
  try {
    return await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false
    })
  } catch (error) {
    console.error('Auth initialization failed:', error)
    return false
  }
}

export const getToken = (): string | undefined => {
  return keycloak.token
}

export const logout = (): void => {
  keycloak.logout()
}
```

### Protected Route Component
```typescript
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { isAuthenticated, userRoles } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => 
      userRoles.includes(role)
    )
    
    if (!hasRequiredRole) {
      return <AccessDenied />
    }
  }
  
  return <>{children}</>
}
```

## API Integration Patterns

### Gateway API Client
```typescript
// utils/apiClient.ts
class GatewayApiClient {
  private baseUrl: string
  private authToken?: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_GATEWAY_URL || ''
  }

  setAuthToken(token: string) {
    this.authToken = token
  }

  async get<T>(endpoint: string, domain?: string): Promise<T> {
    const url = new URL(endpoint, this.baseUrl)
    if (domain) url.searchParams.set('domain', domain)

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }

  async post<T>(endpoint: string, data: any, domain?: string): Promise<T> {
    const url = new URL(endpoint, this.baseUrl)
    if (domain) url.searchParams.set('domain', domain)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }
}

export const apiClient = new GatewayApiClient()
```

### React Query Integration
```typescript
// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../utils/apiClient'

export const useProjects = (domain: string) => {
  return useQuery({
    queryKey: ['projects', domain],
    queryFn: () => apiClient.get(`/api/projects`, domain),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!domain
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ data, domain }: { data: any, domain: string }) =>
      apiClient.post('/api/projects', data, domain),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['projects', variables.domain] 
      })
    }
  })
}
```

## State Management Patterns

### Zustand Store Pattern
```typescript
// stores/projectStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  filters: ProjectFilters
  loading: boolean
  error: string | null
}

interface ProjectActions {
  setProjects: (projects: Project[]) => void
  selectProject: (project: Project) => void
  updateFilters: (filters: Partial<ProjectFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  persist(
    (set, get) => ({
      // State
      projects: [],
      selectedProject: null,
      filters: { status: 'all', search: '' },
      loading: false,
      error: null,
      
      // Actions
      setProjects: (projects) => set({ projects }),
      selectProject: (selectedProject) => set({ selectedProject }),
      updateFilters: (newFilters) => set({ 
        filters: { ...get().filters, ...newFilters } 
      }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      reset: () => set({
        projects: [],
        selectedProject: null,
        filters: { status: 'all', search: '' },
        loading: false,
        error: null
      })
    }),
    {
      name: 'project-store',
      partialize: (state) => ({ 
        filters: state.filters,
        selectedProject: state.selectedProject 
      })
    }
  )
)
```

## Component Patterns

### Design System Integration
```typescript
// components/ProjectCard.tsx
import { Card, Button, Badge, Avatar } from '@briggs-walker/briggsdesignsystem'

interface ProjectCardProps {
  project: Project
  onSelect: (project: Project) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onSelect 
}) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold">{project.name}</h3>
        <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
          {project.status}
        </Badge>
      </div>
      
      <p className="text-gray-600 mb-4">{project.description}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar src={project.manager.avatar} size="sm" />
          <span className="text-sm">{project.manager.name}</span>
        </div>
        
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => onSelect(project)}
        >
          View Details
        </Button>
      </div>
    </Card>
  )
}
```

### Error Boundary Pattern
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorPage } from '@briggs-walker/briggsdesignsystem'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Module error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorPage
          title="Module Error"
          message="This module encountered an error. Please refresh the page."
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}
```

## Testing Patterns

### Component Testing
```typescript
// __tests__/ProjectCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from '../components/ProjectCard'

const mockProject = {
  id: '1',
  name: 'Test Project',
  description: 'Test description',
  status: 'active',
  manager: { name: 'John Doe', avatar: 'avatar.jpg' }
}

describe('ProjectCard', () => {
  it('renders project information', () => {
    const onSelect = jest.fn()
    
    render(<ProjectCard project={mockProject} onSelect={onSelect} />)
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('calls onSelect when button is clicked', () => {
    const onSelect = jest.fn()
    
    render(<ProjectCard project={mockProject} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByText('View Details'))
    
    expect(onSelect).toHaveBeenCalledWith(mockProject)
  })
})
```
