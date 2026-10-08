# Keycloak Architecture - Identity Provider

## 🔐 **Authentication Architecture Context**

> **For complete authentication architecture**: See [`../../authentication-architecture-principles.md`](../../authentication-architecture-principles.md)
>
> Keycloak provides identity services, but **KrakenD Gateway handles JWT validation** for backend services.

## Overview

The Briggs System uses Keycloak as its central identity provider, implementing a customized authentication and authorization solution. This document details the architecture, custom extensions, and integration patterns specific to the Briggs System ecosystem.

## System Architecture

### High-Level Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Client Apps       │───▶│   Keycloak       │◀───│   External APIs     │
│ - React Frontend    │    │ - Authentication │    │ - Pepperminds API   │
│ - Backend Services  │    │ - Authorization  │    │ - SMTP Server       │
│ - Mobile Apps       │    │ - User Management│    │                     │
└─────────────────────┘    └──────────────────┘    └─────────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │   Database       │
                            │ - User Data      │
                            │ - Realm Config   │
                            │ - Sessions       │
                            └──────────────────┘
```

### Keycloak Components

#### Core Keycloak
- **Version**: 26.7.2
- **Runtime**: Java 17
- **Database**: MySQL 8 (`KC_DB=mysql`; Auth repository compose/Helm)
- **Protocol Support**: OAuth 2.0, OpenID Connect, SAML

#### Custom Extensions

##### 1. Briggs Event Listener (`briggs-event-listener`)
```java
// Listens to authentication events
@JBossLog
public class BriggsEventListener implements EventListenerProvider {
    // Tracks last login date
    // Updates user attributes
    // Logs authentication events
}
```

**Architecture Pattern:**
- Event-driven processing
- Asynchronous attribute updates
- Audit trail creation

##### 2. Briggs Hybrid Authentication (`briggs-hybrid-authentication`)
```java
// Custom authenticator for external API validation
public class HybridAuthenticator implements Authenticator {
    // Detects user prefix patterns
    // Validates against Pepperminds API
    // Fallback to standard Keycloak auth
}
```

**Architecture Pattern:**
- Chain of responsibility
- External service integration
- Graceful degradation

##### 3. Keycloak 2FA Email (`keycloak-2fa-email`)
```java
// Email-based two-factor authentication
public class EmailAuthenticator implements Authenticator {
    // Generates OTP codes
    // Sends via SMTP
    // Validates user input
}
```

**Architecture Pattern:**
- Multi-step authentication flow
- Stateful OTP management
- Template-based email generation

#### Custom Theme (`briggstheme`)
- **Login Pages**: Branded login, registration, password reset
- **Account Management**: User profile, password change
- **Email Templates**: Customized notification emails
- **Responsive Design**: Mobile-optimized interface

## Technical Architecture

### Provider Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Keycloak Core                         │
├─────────────────────────────────────────────────────────────────┤
│                    Service Provider Interface (SPI)            │
├─────────────────────┬─────────────────┬─────────────────────────┤
│   Event Listener    │   Authenticator │    Email Provider       │
│       SPI           │       SPI       │          SPI            │
├─────────────────────┼─────────────────┼─────────────────────────┤
│ BriggsEventListener │ HybridAuth      │   EmailAuthenticator    │
│ - Login tracking    │ - API validation│   - OTP generation      │
│ - Attribute updates │ - Prefix routing│   - SMTP integration    │
└─────────────────────┴─────────────────┴─────────────────────────┘
```

### Authentication Flow Architecture

#### Standard Authentication Flow
```
1. User Login Request
   ↓
2. Realm Selection
   ↓
3. Authentication Provider Selection
   ↓
4. Credential Validation
   ↓
5. Event Listener Execution
   ↓
6. Token Generation
   ↓
7. Redirect to Client
```

#### Hybrid Authentication Flow (Pepperminds Users)
```
1. User Login Request (with prefix)
   ↓
2. Hybrid Authenticator Triggered
   ↓
3. External API Validation
   ↓
4. Local User Creation/Update
   ↓
5. Standard Flow Continuation
```

#### 2FA Email Flow
```
1. Primary Authentication Success
   ↓
2. 2FA Challenge Required
   ↓
3. OTP Generation
   ↓
4. Email Dispatch (SMTP)
   ↓
5. User OTP Input
   ↓
6. OTP Validation
   ↓
7. Authentication Complete
```

## Data Architecture

### User Data Model

```yaml
User:
  id: UUID
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  emailVerified: boolean
  
  # Custom Attributes
  lastLoginDate: timestamp
  peppermindsId: string (optional)
  domain: string
  organizationId: string
  
  # Roles and Groups
  realmRoles: string[]
  clientRoles: Map<string, string[]>
  groups: string[]
```

### Realm Configuration
```yaml
Realm:
  name: "briggs-system"
  displayName: "Briggs System"
  enabled: true
  
  # Authentication Settings
  registrationAllowed: false
  resetPasswordAllowed: true
  rememberMe: true
  
  # Token Settings
  accessTokenLifespan: 15 minutes
  refreshTokenLifespan: 30 days
  ssoSessionMaxLifespan: 8 hours
  
  # Custom Providers
  eventListeners:
    - briggs-event-listener
  
  authenticationFlows:
    - browser-flow-with-2fa
    - hybrid-authentication-flow
```

### Session Management
```yaml
Session:
  sessionId: UUID
  userId: UUID
  realmId: UUID
  clientId: string
  ipAddress: string
  started: timestamp
  lastAccess: timestamp
  
  # Session State
  state: ACTIVE | LOGGED_OUT | EXPIRED
  
  # Custom Data
  loginMethod: STANDARD | HYBRID | SSO
  mfaCompleted: boolean
```

## Integration Architecture

### Gateway Integration (KrakenD)

```yaml
# JWT Validation
jwt:
  alg: RS256
  jwks_url: "http://keycloak:8080/realms/briggs-system/protocol/openid-connect/certs"
  issuer: "http://keycloak:8080/realms/briggs-system"
  
# Token Introspection (for confidential clients)
auth:
  introspect_url: "http://keycloak:8080/realms/briggs-system/protocol/openid-connect/token/introspect"
  client_id: "gateway-client"
  client_secret: "${GATEWAY_CLIENT_SECRET}"
```

### Frontend Integration

```typescript
// React OIDC Configuration
const keycloakConfig = {
  url: 'http://keycloak:8080',
  realm: 'briggs-system',
  clientId: 'briggs-frontend',
  
  // Flow Configuration
  responseType: 'code',
  scope: 'openid profile email',
  
  // Advanced Settings
  checkLoginIframe: true,
  silentCheckSsoRedirectUri: '/silent-check-sso.html',
  enableLogging: true
};
```

### Backend Service Integration

> 🔐 **CRITICAL ARCHITECTURE NOTE**: In the Briggs System, backend services do **NOT** implement JWT validation. All authentication is handled by KrakenD Gateway. 

**Correct Architecture:**
```
Frontend → KrakenD (JWT Validation) → Backend Service (Pre-authenticated)
```

**Backend Service Configuration (User Context Only):**
```csharp
// .NET Service - Extract user context from KrakenD headers
public abstract class BaseController : ControllerBase
{
    protected string GetUserId()
    {
        return Request.Headers["x-sub"].FirstOrDefault() 
            ?? throw new UnauthorizedAccessException("User context missing from KrakenD");
    }
    
    protected string[] GetUserRoles()
    {
        var rolesHeader = Request.Headers["x-user-roles"].FirstOrDefault();
        return rolesHeader?.Split(',') ?? Array.Empty<string>();
    }
}

// Usage in controllers
[ApiController]
public class UsersController : BaseController
{
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var userId = GetUserId(); // Pre-authenticated by KrakenD
        // Business logic here
        return Ok(users);
    }
}
```

**KrakenD Configuration (Claims Propagation):**
```json
{
  "auth/validator": {
    "alg": "RS256",
    "jwk_url": "http://keycloak:8080/realms/briggs-system/protocol/openid-connect/certs",
    "propagate_claims": [
      ["sub", "x-sub"],
      ["realm_access.roles", "x-user-roles"],
      ["domain", "x-user-domain"]
    ]
  }
}
```

## Security Architecture

### Multi-Tenant Security

```yaml
# Domain-Based Access Control
User Attributes:
  domain: "client-a" | "client-b" | "internal"
  organizationId: UUID
  accessLevel: "read" | "write" | "admin"

# Role Mapping
Client Roles:
  briggs-frontend:
    - user
    - manager
    - admin
  
  briggs-backend:
    - api-user
    - api-admin
```

### Token Security

```yaml
# Access Token Claims
{
  "iss": "http://keycloak:8080/realms/briggs-system",
  "sub": "user-uuid",
  "aud": "briggs-frontend",
  "exp": 1640995200,
  "iat": 1640994300,
  "realm_access": {
    "roles": ["user"]
  },
  "resource_access": {
    "briggs-frontend": {
      "roles": ["frontend-user"]
    }
  },
  "domain": "client-a",
  "organizationId": "org-uuid"
}
```

## Deployment Architecture

### Container Architecture

```dockerfile
# Multi-stage build
FROM maven:3.8-openjdk-17 AS builder
# Build custom providers

FROM quay.io/keycloak/keycloak:26.7.2
# Copy providers and themes
# Configure startup
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: keycloak
        image: briggs-keycloak:latest
        env:
        - name: KC_DB
          value: postgres
        - name: KC_DB_URL
          valueFrom:
            secretKeyRef:
              name: keycloak-db
              key: url
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
```

## Performance Considerations

### Scaling Strategy
- **Horizontal Scaling**: Multiple Keycloak instances behind load balancer
- **Session Clustering**: Shared session store (Redis/Infinispan)
- **Database Optimization**: Connection pooling, read replicas

### Caching Strategy
```yaml
# User Cache
user-cache:
  enabled: true
  max-size: 10000
  eviction-policy: LRU
  
# Realm Cache
realm-cache:
  enabled: true
  max-size: 1000
  ttl: 1 hour
```

### Monitoring

```yaml
# Health Endpoints
/health/ready    # Readiness probe
/health/live     # Liveness probe
/metrics         # Prometheus metrics

# Custom Metrics
authentication_requests_total
authentication_failures_total
session_duration_seconds
provider_execution_duration_seconds
```

## Best Practices

### Provider Development
1. **Stateless Design**: Providers should be stateless for horizontal scaling
2. **Error Handling**: Graceful degradation and proper error responses
3. **Logging**: Structured logging with appropriate levels
4. **Testing**: Unit tests for business logic, integration tests for flows

### Security Best Practices
1. **Secret Management**: Use Kubernetes secrets for sensitive configuration
2. **TLS**: Always use HTTPS in production
3. **Token Rotation**: Regular key rotation and token refresh
4. **Audit Logging**: Comprehensive audit trail for compliance

### Operational Best Practices
1. **Health Checks**: Implement proper readiness and liveness probes
2. **Graceful Shutdown**: Handle pod termination gracefully
3. **Resource Limits**: Set appropriate CPU and memory limits
4. **Backup Strategy**: Regular database backups and disaster recovery planning
