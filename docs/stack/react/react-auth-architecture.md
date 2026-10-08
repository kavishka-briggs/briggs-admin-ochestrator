# React Authentication Architecture Principles and Best Practices

This document outlines the architecture principles and coding best practices for React authentication modules within the Briggs System ecosystem. These guidelines ensure secure, maintainable, and scalable authentication across React microfrontend repositories using Keycloak integration and module federation.

## Project Structure and Organization

### Authentication Module Architecture Pattern

Follow a clean, modular authentication architecture with clear separation of concerns:

```
project-root/
├── frontend/                # React authentication module root
│   ├── src/
│   │   ├── api/            # Authentication API layer
│   │   │   └── api.ts      # Organization validation API
│   │   ├── pages/          # Authentication page components
│   │   │   ├── Auth.tsx    # Main authentication component
│   │   │   └── OrganizationPage.tsx # Organization handling
│   │   ├── keycloak/       # Keycloak integration layer
│   │   │   └── keycloak.ts # Keycloak client configuration
│   │   ├── utils/          # Authentication utilities
│   │   │   ├── apiClient.ts    # Authenticated API client
│   │   │   ├── loadConfig.tsx  # Dynamic configuration loader
│   │   │   └── logging.ts      # Authentication event tracking
│   │   ├── config/         # Configuration management
│   │   │   └── index.ts    # Gateway URL configuration
│   │   ├── components/     # Authentication UI components
│   │   └── global.d.ts     # TypeScript environment definitions
│   ├── public/
│   │   └── config.js       # Runtime configuration template
│   ├── server.js           # Express server for dynamic config
│   ├── vite.config.ts      # Module federation configuration
│   └── Dockerfile          # Containerization setup
└── config.json             # Module metadata configuration
```

### Key Authentication Principles

1. **Token-Based Authentication**: JWT tokens managed through Keycloak integration
2. **Dynamic Configuration**: Runtime environment configuration loading
3. **Organization Validation**: Multi-step authentication with organization checks
4. **Module Federation**: Expose authentication components for consumption
5. **Centralized Logging**: Track authentication events for monitoring
6. **Automatic Token Refresh**: Handle token lifecycle management

## Keycloak Integration Architecture

### Keycloak Client Configuration

Implement secure Keycloak integration with proper initialization and lifecycle management:

```typescript
// keycloak/keycloak.ts
import Keycloak from "keycloak-js";
import { ensureConfigLoaded } from "../utils/loadConfig";

export let kc: Keycloak;
let initialized = false;

export const initializeKeycloak = async (): Promise<boolean> => {
  // Ensure configuration is loaded before initialization
  await ensureConfigLoaded();

  const clientId = (window as any).env?.VITE_KEYCLOAK_CLIENT_ID;
  const realm = (window as any).env?.VITE_KEYCLOAK_REALM;
  const keycloakUrl = (window as any).env?.VITE_KEYCLOAK_URL;

  if (!clientId || !realm || !keycloakUrl) {
    throw new Error("Keycloak configuration is missing required values.");
  }

  if (!kc) {
    kc = new Keycloak({
      url: keycloakUrl,
      realm: realm,
      clientId: clientId,
    });
  }

  if (!initialized) {
    initialized = true;
    return kc.init({
      onLoad: "login-required",
      checkLoginIframe: false,
    });
  }

  return Promise.resolve(kc.authenticated || false);
};

export const logout = (): void => {
  if (kc) {
    kc.logout();
  }
};
```

### Authentication Configuration Management

1. **Environment Variables**: Use runtime configuration for different environments
2. **Dynamic Loading**: Load configuration asynchronously at runtime
3. **Secure Storage**: Store sensitive configuration server-side
4. **Validation**: Validate all required configuration parameters

### Keycloak Best Practices

1. **Login-Required Mode**: Force authentication before application access
2. **Token Refresh**: Implement automatic token refresh with proper error handling
3. **Logout Handling**: Provide clean logout functionality
4. **Security Headers**: Configure proper CORS and security policies
5. **Error Boundaries**: Handle authentication failures gracefully

## Authentication Flow Implementation

### Main Authentication Component

Implement comprehensive authentication flow with organization validation:

```typescript
// pages/Auth.tsx
import { useEffect } from "react";
import { initializeKeycloak, logout, kc } from "../keycloak/keycloak";
import { ensureConfigLoaded } from "../utils/loadConfig";
import { tracker } from "../utils/logging";
import { getOrganizations } from "../api/api";

type AuthStatus = 
  | "loading" 
  | "authenticated" 
  | "failed" 
  | "token-expired"
  | "organization-invalid" 
  | "organization-not-created";

interface KeycloakObject {
  status: AuthStatus;
  token?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  preferredLanguage?: string;
  primaryAgencyOffice?: string;
  primaryAgencyDomain?: string;
  primaryGlobalDomain?: string;
  primaryGlobalOffice?: string;
  completed_onboarding?: boolean;
}

interface AuthProps {
  onAuthStatus?: (status: KeycloakObject) => void;
}

const Auth = ({ onAuthStatus }: AuthProps) => {
  useEffect(() => {
    (async () => {
      try {
        // Load configuration and initialize Keycloak
        await ensureConfigLoaded();
        const authenticated = await initializeKeycloak();

        if (!authenticated) return;

        // Track authentication success
        tracker("user_login", { action: "User authenticated" });
        localStorage.setItem("token", kc.token ?? "");

        // Validate organization
        const orgs = await getOrganizations();
        if (orgs.length > 1) {
          tracker("user_login", { action: "User authenticated with invalid organization" });
          onAuthStatus?.({ status: "organization-invalid" });
          return;
        }
        if (orgs.length === 0) {
          tracker("user_login", { action: "User has no organization" });
          onAuthStatus?.({ status: "organization-not-created" });
          return;
        }

        // Successful authentication with valid organization
        const payload: KeycloakObject = {
          status: "authenticated",
          token: kc.token,
          firstName: kc.tokenParsed?.given_name,
          lastName: kc.tokenParsed?.family_name,
          displayName: kc.tokenParsed?.name,
          email: kc.tokenParsed?.email,
          preferredLanguage: kc.tokenParsed?.locale,
          primaryAgencyOffice: orgs[0].primaryAgencyOffice,
          primaryAgencyDomain: orgs[0].primaryAgencyDomain,
          primaryGlobalDomain: orgs[0].primaryGlobalDomain,
          primaryGlobalOffice: orgs[0].primaryGlobalOffice,
          completed_onboarding: kc.tokenParsed?.completed_onboarding === "true",
        };
        onAuthStatus?.(payload);

        // Configure token refresh handling
        kc.onTokenExpired = async () => {
          try {
            await kc.updateToken(0);
            localStorage.setItem("token", kc.token ?? "");
            onAuthStatus?.(payload);
            tracker("user_login", { action: "Token successfully refreshed" });
          } catch {
            tracker("user_login", { action: "Refresh failed - logging out" });
            logout();
          }
        };
      } catch (err) {
        tracker("user_login", { action: "Authentication failed", error: err });
        onAuthStatus?.({ status: "failed" });
        console.error("Authentication failed:", err);
      }
    })();
  }, []);

  // Token refresh interval
  useEffect(() => {
    if (!kc?.authenticated) return;

    const handle = window.setInterval(async () => {
      try {
        const refreshed = await kc.updateToken(70);
        if (refreshed) {
          localStorage.setItem("token", kc.token ?? "");
          tracker("user_login", { action: "Token refreshed" });
          // Update auth status with refreshed token
        }
      } catch {
        tracker("user_login", { action: "Refresh failed - logging out" });
        logout();
      }
    }, 60_000);

    return () => clearInterval(handle);
  }, [kc?.authenticated]);

  // Global logout event handling
  useEffect(() => {
    const handler = () => {
      tracker("user_login", { action: "User logged out" });
      logout();
    };
    window.addEventListener("bw-auth-logout", handler);
    return () => window.removeEventListener("bw-auth-logout", handler);
  }, []);

  return null;
};
```

### Authentication Flow Principles

1. **Progressive Authentication**: Step-by-step validation process
2. **Organization Validation**: Verify user's organization access
3. **Token Management**: Automatic refresh and storage handling
4. **Event Tracking**: Comprehensive logging for monitoring
5. **Error Handling**: Graceful failure management
6. **Global Events**: Handle cross-module logout events

## Configuration Management

### Dynamic Configuration Loading

Implement runtime configuration loading for different environments:

```typescript
// utils/loadConfig.tsx
export const ensureConfigLoaded = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Check if configuration is already loaded
    if (window.env && Object.keys(window.env).length > 0) {
      resolve();
      return;
    }

    // Dynamically determine the base URL
    const moduleBaseUrl = new URL(".", import.meta.url).origin;
    
    // Load configuration script
    const script = document.createElement("script");
    script.src = `${moduleBaseUrl}/config.js`;
    script.onload = () => {
      if (window.env && Object.keys(window.env).length > 0) {
        resolve();
      } else {
        reject(new Error("config.js loaded but window.env is still undefined or empty."));
      }
    };
    script.onerror = () => reject(new Error("Failed to load config.js"));
    document.head.appendChild(script);
  });
};
```

### Server-Side Configuration

Express server for dynamic configuration serving:

```javascript
// server.js
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and CORS configuration
app.use(cors({
  origin: process.env.URL_ORCHESTRATOR || "",
  methods: "*",
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Dynamically serve configuration
app.get("/config.js", (req, res) => {
  const config = `
    window.env = {
      VITE_KEYCLOAK_CLIENT_ID: "${process.env.VITE_KEYCLOAK_CLIENT_ID?.trim() || ""}",
      VITE_KEYCLOAK_REALM: "${process.env.VITE_KEYCLOAK_REALM?.trim() || ""}",
      VITE_KEYCLOAK_URL: "${process.env.VITE_KEYCLOAK_URL?.trim() || ""}",
      VITE_GATEWAY_URL: "${process.env.VITE_GATEWAY_URL?.trim() || ""}"
    };
  `;
  res.setHeader("Content-Type", "application/javascript");
  res.send(config);
});

// Serve static files and handle routing
app.use(express.static("/app"));
app.get("*", (_, res) => {
  res.sendFile("/app/index.html");
});
```

### Configuration Best Practices

1. **Environment Separation**: Different configurations for dev/staging/production
2. **Runtime Loading**: Load configuration at runtime, not build time
3. **Validation**: Validate required configuration parameters
4. **Security**: Keep sensitive values server-side
5. **Error Handling**: Provide meaningful error messages for missing config

## API Client and Token Management

### Authenticated API Client

Create reusable API client with automatic token injection:

```typescript
// utils/apiClient.ts
import axios, { AxiosInstance } from "axios";
import { GATEWAY_URL } from "../config";

export const apiClient = (): AxiosInstance => {
  const token = localStorage.getItem("token");

  const instance = axios.create({
    baseURL: GATEWAY_URL,
    headers: {
      Authorization: `Bearer ${token}`
    },
  });

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle authentication errors
      if (error.response?.status === 401) {
        // Trigger logout or token refresh
        window.dispatchEvent(new CustomEvent("bw-auth-logout"));
      }
      return Promise.reject(error);
    }
  );

  return instance;
};
```

### Organization Validation API

```typescript
// api/api.ts
import { apiClient } from "../utils/apiClient";

export const getOrganizations = async () => {
  const response = await apiClient().get(`/api/organizations`);
  return response.data.organizations;
};
```

### Token Management Best Practices

1. **Secure Storage**: Use localStorage for client-side token storage
2. **Automatic Injection**: Add tokens to API requests automatically
3. **Error Handling**: Handle 401 errors with automatic logout
4. **Token Refresh**: Implement proactive token refresh strategies
5. **Cleanup**: Clear tokens on logout

## Module Federation Configuration

### Vite Federation Setup

Configure module federation to expose authentication components:

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
      name: "Auth",
      filename: "remoteEntry.js",
      exposes: {
        "./AuthenticatorModule": "./src/pages/Auth.tsx",
        "./OrganizationInvalidModule": "./src/pages/OrganizationPage.tsx"
      },
      shared: ["react", "react-dom"]
    })
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
})
```

### Federation Principles

1. **Component Isolation**: Each exposed component is self-contained
2. **Shared Dependencies**: Share React and React DOM across modules
3. **Versioning**: Maintain compatibility across module versions
4. **Error Boundaries**: Implement error boundaries for federated components
5. **Performance**: Optimize build configuration for federation

## Logging and Monitoring

### Authentication Event Tracking

Implement comprehensive logging for authentication events:

```typescript
// utils/logging.ts
import { dispatch } from "@briggs-walker/briggs-logging";
import { EventName, EventProperties } from "@briggs-walker/briggs-logging/dist/types";

export const tracker = (eventName: EventName, eventProperties: EventProperties): void => {
  dispatch(eventName, eventProperties, "briggs-modules-authentication");
};

// Usage examples:
tracker("user_login", { action: "User authenticated" });
tracker("user_login", { action: "Token expired - attempting refresh" });
tracker("user_login", { action: "User authenticated with invalid organization" });
tracker("user_login", { action: "Authentication failed", error: err });
```

### Monitoring Best Practices

1. **Event Tracking**: Track all authentication state changes
2. **Error Logging**: Log authentication failures with context
3. **Performance Metrics**: Monitor authentication timing
4. **User Journey**: Track complete authentication flows
5. **Security Events**: Monitor for suspicious authentication patterns

## TypeScript Integration

### Environment Type Definitions

Define proper TypeScript interfaces for environment configuration:

```typescript
// global.d.ts
interface Window {
  env?: {
    VITE_KEYCLOAK_CLIENT_ID?: string;
    VITE_KEYCLOAK_REALM?: string;
    VITE_KEYCLOAK_URL?: string;
    VITE_GATEWAY_URL?: string;
    [key: string]: string | undefined;
  };
}
```

### Authentication Types

```typescript
// Types for authentication flow
type AuthStatus = 
  | "loading" 
  | "authenticated" 
  | "failed" 
  | "token-expired"
  | "organization-invalid" 
  | "organization-not-created";

interface KeycloakObject {
  status: AuthStatus;
  token?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  preferredLanguage?: string;
  primaryAgencyOffice?: string;
  primaryAgencyDomain?: string;
  primaryGlobalDomain?: string;
  primaryGlobalOffice?: string;
  completed_onboarding?: boolean;
}

interface AuthProps {
  onAuthStatus?: (status: KeycloakObject) => void;
}
```

## Security Best Practices

### Authentication Security

1. **HTTPS Only**: Ensure all authentication endpoints use HTTPS
2. **Token Validation**: Only KrakenD validates JWT signatures for API authorization. React clients obtain and refresh tokens via Keycloak (or `react-native-app-auth`) and may decode claims for UX; they must not implement JWKS/signature checks as a substitute for the gateway. See [`authentication-architecture-principles.md`](../../authentication-architecture-principles.md).
3. **CORS Configuration**: Properly configure CORS for authentication endpoints
4. **Security Headers**: Implement proper security headers
5. **Session Management**: Handle session timeouts and cleanup

### Configuration Security

1. **Environment Variables**: Use environment variables for sensitive configuration
2. **No Client Secrets**: Never expose client secrets in frontend code
3. **Runtime Configuration**: Load configuration at runtime, not build time
4. **Validation**: Validate all configuration parameters
5. **Error Messages**: Avoid exposing sensitive information in error messages

## Error Handling and Recovery

### Authentication Error Scenarios

1. **Configuration Missing**: Handle missing Keycloak configuration
2. **Network Failures**: Handle network connectivity issues
3. **Token Expired**: Implement automatic token refresh
4. **Organization Invalid**: Handle organization validation failures
5. **Logout Events**: Handle cross-module logout events

### Recovery Strategies

```typescript
// Error handling example
try {
  await ensureConfigLoaded();
  const authenticated = await initializeKeycloak();
  
  if (!authenticated) {
    // Handle authentication failure
    onAuthStatus?.({ status: "failed" });
    return;
  }
  
  // Continue with authentication flow
} catch (err) {
  tracker("user_login", { action: "Authentication failed", error: err });
  onAuthStatus?.({ status: "failed" });
  console.error("Authentication failed:", err);
}
```

## Deployment and DevOps

### Container Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy production build
COPY dist /app

# Copy Express server and dependencies
COPY server.js /app/server.js
COPY package.json /app/package.json
COPY node_modules /app/node_modules

EXPOSE 3000

CMD ["node", "/app/server.js"]
```

### Environment Configuration

```bash
# .env.example
VITE_KEYCLOAK_CLIENT_ID=client-id
VITE_KEYCLOAK_REALM=realm
VITE_KEYCLOAK_URL=https://keycloak-url/realms/realm
VITE_GATEWAY_URL=https://gateway.domain.com
URL_ORCHESTRATOR=https://orchestrator.domain.com
```

### Deployment Best Practices

1. **Environment Separation**: Separate configurations for different environments
2. **Health Checks**: Implement health check endpoints
3. **Graceful Shutdown**: Handle container shutdown gracefully
4. **Logging**: Configure proper logging for production
5. **Monitoring**: Set up monitoring and alerting

## Testing Strategies

### Authentication Testing

1. **Unit Tests**: Test individual authentication functions
2. **Integration Tests**: Test complete authentication flows
3. **End-to-End Tests**: Test authentication across modules
4. **Security Tests**: Test authentication security measures
5. **Performance Tests**: Test authentication performance

### Testing Considerations

```typescript
// Mock Keycloak for testing
jest.mock('keycloak-js', () => {
  return jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(true),
    authenticated: true,
    token: 'mock-token',
    tokenParsed: {
      given_name: 'John',
      family_name: 'Doe',
      email: 'john.doe@example.com'
    },
    updateToken: jest.fn().mockResolvedValue(true),
    logout: jest.fn()
  }));
});
```

## Performance Optimization

### Authentication Performance

1. **Lazy Loading**: Load authentication components when needed
2. **Token Caching**: Cache tokens appropriately
3. **Network Optimization**: Minimize authentication network calls
4. **Bundle Optimization**: Optimize authentication bundle size
5. **Federation Performance**: Optimize module federation loading

### Best Practices

1. **Code Splitting**: Split authentication code from main application
2. **Preloading**: Preload authentication configuration
3. **Caching**: Cache authentication state appropriately
4. **Debouncing**: Debounce token refresh attempts
5. **Error Recovery**: Implement efficient error recovery

## Maintenance and Updates

### Version Management

1. **Semantic Versioning**: Use semantic versioning for authentication modules
2. **Backward Compatibility**: Maintain backward compatibility when possible
3. **Migration Guides**: Provide migration guides for breaking changes
4. **Documentation**: Keep documentation updated with changes
5. **Testing**: Test compatibility across module versions

### Maintenance Practices

1. **Regular Updates**: Keep Keycloak and dependencies updated
2. **Security Patches**: Apply security patches promptly
3. **Performance Monitoring**: Monitor authentication performance
4. **User Feedback**: Collect and address user authentication issues
5. **Code Reviews**: Implement thorough code reviews for authentication changes

This architecture ensures secure, scalable, and maintainable authentication across the Briggs System microfrontend ecosystem while following industry best practices for React applications and Keycloak integration.
