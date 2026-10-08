# React Stack - Quick Reference

**CANONICAL SOURCE**: React-specific ports, environment variables, and configuration.

## 🔐 **Authentication Flow**

> **Frontend Authentication**: [`../../authentication-architecture-principles.md`](../../authentication-architecture-principles.md)
>
> React → Keycloak JWT → KrakenD validation → API headers

## 1. React Ports & URLs

| Service | Development | Container | Notes |
|---------|-------------|-----------|--------|
| Vite Dev Server | 5173 | N/A | Hot reload |
| React Production | 3000 | 3000 | Nginx served |
| Module Federation | 3000 | 3000 | Remote entry |

### Development URLs
```bash
Local Module:     http://localhost:5173
Production Build: http://localhost:3000  
Module Remote:    http://localhost:3000/remoteEntry.js
```

## 2. Environment Variables

### Required Variables
```bash
# Authentication
VITE_KEYCLOAK_CLIENT_ID=your-client-id
VITE_KEYCLOAK_REALM=briggs
VITE_KEYCLOAK_URL=https://login.briggsandwalker.com

# API Gateway
VITE_GATEWAY_URL=https://gateway.briggsandwalker.com

# Module Federation
VITE_MFE_BASE_URL=https://modules.briggsandwalker.com
URL_ORCHESTRATOR=https://app.briggsandwalker.com
```

### Optional Variables
```bash
VITE_LOG_LEVEL=info|debug|error
VITE_ENVIRONMENT=development|staging|production
VITE_API_TIMEOUT=10000
```

## 3. Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

### Module Federation
```bash
# Build and serve module
npm run build && npm run preview

# Test federation locally
npm run federation:serve
```

## 4. Configuration Patterns

### Vite Config (Module Federation)
```typescript
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "ModuleName",
      filename: "remoteEntry.js",
      exposes: {
        "./ComponentName": "./src/pages/ComponentName.tsx"
      },
      shared: ["react", "react-dom"]
    })
  ]
})
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

## 5. File Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   ├── pages/              # Module federation entries
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand stores
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   └── config/             # Configuration
├── public/
│   └── locales/            # i18n translations
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies
```
