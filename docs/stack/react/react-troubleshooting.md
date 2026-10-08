# React Stack - Troubleshooting

**PROBLEM-SOLVING FOCUS**: React-specific solutions and debugging.

## Module Federation Issues

### Problem: Module federation remote not loading
**Symptoms:**
- "Loading chunk failed" errors
- Remote modules showing as undefined
- Federation build succeeds but runtime fails

**Solutions:**
```bash
# 1. Check remote entry URL accessibility
curl http://localhost:3000/remoteEntry.js

# 2. Verify vite.config.ts federation setup
# Ensure remotes URLs are correct and accessible
remotes: {
  projects: 'http://localhost:3000/remoteEntry.js'  # Must be accessible
}

# 3. Check browser network tab
# Look for 404s on remoteEntry.js or chunk files

# 4. Verify exposed module names match imports
# In remote module:
exposes: {
  './ProjectsPage': './src/pages/ProjectsPage.tsx'
}
# In consumer:
const ProjectsPage = React.lazy(() => import('projects/ProjectsPage'))
```

### Problem: Shared dependencies version conflicts
**Symptoms:**
- React hooks errors ("Hooks can only be called...")
- Multiple React instances detected
- Styling conflicts between modules

**Solutions:**
```typescript
// vite.config.ts - Ensure consistent shared dependencies
federation({
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    zustand: { singleton: true }
  }
})

// package.json - Lock versions across modules
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## Authentication Issues

### Problem: Keycloak authentication fails
**Symptoms:**
- Infinite redirect loops
- "Failed to initialize adapter" errors
- Token validation failures

**Solutions:**
```bash
# 1. Check environment variables
echo $VITE_KEYCLOAK_URL      # Should include protocol
echo $VITE_KEYCLOAK_REALM    # Case sensitive
echo $VITE_KEYCLOAK_CLIENT_ID

# 2. Verify Keycloak client configuration
# In Keycloak admin console:
# - Valid Redirect URIs: http://localhost:3000/*
# - Web Origins: http://localhost:3000
# - Access Type: public (for frontend)

# 3. Check browser network tab for auth requests
# Look for CORS errors or 401/403 responses
```

### Problem: Token expired handling
**Symptoms:**
- User gets logged out unexpectedly
- API calls failing with 401 after some time
- Token refresh not working

**Solutions:**
```typescript
// utils/auth.ts - Implement token refresh
keycloak.init({
  onLoad: 'login-required',
  checkLoginIframe: false,
  enableLogging: true
}).then(() => {
  // Auto-refresh token
  setInterval(() => {
    keycloak.updateToken(30).catch(() => {
      console.log('Token refresh failed, redirecting to login')
      keycloak.login()
    })
  }, 10000) // Check every 10 seconds
})

// API client - Handle token refresh
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${await getValidToken()}`
  }
})

async function getValidToken(): Promise<string> {
  await keycloak.updateToken(30)
  return keycloak.token!
}
```

## API Integration Issues

### Problem: CORS errors with gateway
**Symptoms:**
- "Access to fetch blocked by CORS policy"
- Preflight request failures
- API calls work in Postman but not browser

**Solutions:**
```bash
# 1. Check gateway CORS configuration in KrakenD
# Ensure these headers are allowed:
"extra_config": {
  "security/cors": {
    "allow_origins": ["http://localhost:3000", "http://localhost:5173"],
    "allow_methods": ["GET", "POST", "PUT", "DELETE"],
    "allow_headers": ["Authorization", "Content-Type"]
  }
}

# 2. Check development proxy in vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
```

### Problem: API calls returning 404 or wrong responses
**Symptoms:**
- Endpoints returning 404 when they should exist
- Getting responses from wrong domain/tenant
- Data appears but for wrong user/domain

**Solutions:**
```typescript
// Ensure domain parameter is included
const response = await apiClient.get('/api/projects', currentDomain)

// Check if domain is properly set
const domain = localStorage.getItem('selectedDomain')
if (!domain) {
  console.error('No domain selected')
  // Redirect to domain selection
}

// Verify API URL construction
console.log('API URL:', `${baseUrl}/api/projects?domain=${domain}`)
```

## Development Issues

### Problem: Hot reload not working
**Symptoms:**
- Changes don't reflect immediately
- Page requires manual refresh
- Console shows connection errors

**Solutions:**
```bash
# 1. Check Vite dev server configuration
# vite.config.ts
server: {
  host: true,  # Allow external connections
  port: 5173,
  hmr: {
    port: 5173
  }
}

# 2. Clear cache and restart
rm -rf node_modules/.vite
npm run dev

# 3. Check for file watching issues
# Increase file watcher limit on Linux:
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Problem: TypeScript errors in federation
**Symptoms:**
- Type errors for remote modules
- "Cannot find module" errors
- IntelliSense not working for remotes

**Solutions:**
```typescript
// Create type declarations for remotes
// types/federation.d.ts
declare module 'projects/ProjectsPage' {
  const ProjectsPage: React.ComponentType
  export default ProjectsPage
}

// Or use dynamic imports with proper typing
const ProjectsPage = React.lazy(() => 
  import('projects/ProjectsPage') as Promise<{ 
    default: React.ComponentType 
  }>
)
```

## Build Issues

### Problem: Production build fails
**Symptoms:**
- Build process exits with errors
- Missing dependencies in production
- Chunks failing to load

**Solutions:**
```bash
# 1. Check build configuration
# vite.config.ts
build: {
  target: 'esnext',
  minify: false,  # Disable if federation issues
  cssCodeSplit: false,
  rollupOptions: {
    external: ['react', 'react-dom']  # Externalize shared deps
  }
}

# 2. Analyze bundle
npm run build -- --analyze

# 3. Check for dynamic imports issues
# Ensure all dynamic imports are properly handled
const LazyComponent = React.lazy(() => 
  import('./Component').catch(() => ({ default: () => <div>Failed to load</div> }))
)
```

### Problem: Environment variables not working in production
**Symptoms:**
- Variables work in dev but not production
- API calls failing with undefined URLs
- Configuration not loading

**Solutions:**
```bash
# 1. Ensure variables are prefixed with VITE_
VITE_GATEWAY_URL=https://api.example.com  # ✅ Works
GATEWAY_URL=https://api.example.com       # ❌ Won't work

# 2. Check build environment
npm run build
# Verify variables are embedded in dist files

# 3. Use runtime configuration for production
# public/config.js
window.env = {
  VITE_GATEWAY_URL: 'https://api.example.com'
}

# index.html
<script src="/config.js"></script>
```

## Performance Issues

### Problem: Slow module loading
**Symptoms:**
- Long loading times for federated modules
- UI freezes during module loading
- Large bundle sizes

**Solutions:**
```typescript
// 1. Implement proper loading states
const LazyModule = React.lazy(() => import('projects/ProjectsPage'))

function App() {
  return (
    <Suspense fallback={<ModuleLoadingSpinner />}>
      <LazyModule />
    </Suspense>
  )
}

// 2. Preload critical modules
// Preload on route hover or idle time
const preloadModule = () => {
  import('projects/ProjectsPage')
}

// 3. Optimize shared dependencies
// Only share what's necessary
shared: {
  react: { singleton: true },
  'react-dom': { singleton: true }
  // Don't share large libraries unless needed
}
```
