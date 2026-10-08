# KrakenD Custom Auth Plugin Development Guide

**Last Updated:** June 15, 2025  
**Plugin Version:** 1.0  
**Stack:** KrakenD Gateway  

## Overview

The KrakenD Gateway uses a custom Go-based **authorization** plugin. JWT **signature** validation is KrakenD native `auth/validator` (RS256 + Keycloak JWKs), not this plugin. The plugin reads identity headers KrakenD already propagated (`x-sub`, `x-user-roles`) and calls PTTN Auth API / BriggsBase to enforce Domain → Project → Office access. See [`authentication-architecture-principles.md`](../../authentication-architecture-principles.md).

Live `pttn-authapi` grant routes (`.NET 10`, container `8080`): `GET /api/domains`, `GET /api/domains/token`, `GET /api/domains/legacy-token`, `GET /api/projects/authorized`, `GET /api/offices`, `GET /api/offices/token`, `GET /api/as`, `GET /api/as/token`. `GET /api/projects/authorized` currently returns `{ Projects: [{ projectCode, domainCode, roles }] }` (enum strings), not the compact `{p,d,r}` example below. Identity must still be `x-sub`; query `userId` is a service contract violation, not a documented exception.

## 🏗️ Plugin Architecture

### Core Components

```go
// Main plugin structure (authorization enricher — no JWT parser)
type AuthPlugin struct {
    logger    logger.Logger
    apiClient *http.Client
    config    AuthConfig
}

// Token data structure
type ActiveProjectsTokenItem struct {
    ProjectCode string   `json:"p"`
    DomainCode  string   `json:"d"`
    Roles       []string `json:"r"`
}

// Authorization request structure
type ActiveDomainsRequest struct {
    ActiveDomains []ActiveDomain `json:"domains"`
}
```

### Plugin Interface Implementation

The plugin implements the KrakenD plugin interface with these key methods:

- `ModifyRequest()` - Processes incoming requests
- `ModifyResponse()` - Handles response modifications
- `RegisterHandlers()` - Registers HTTP handlers

## 🔐 Authentication Flow

### 1. Require KrakenD identity headers

```go
// JWT already validated by KrakenD auth/validator on plugin routes.
userID := req.Header.Get("X-Sub")
if userID == "" {
    return errors.New("missing x-sub")
}
roles := req.Header.Get("X-User-Roles")
```

### 2. Do not validate JWT in the plugin

The plugin must not parse or verify JWT signatures (`validateJWTToken`, `JWT_SECRET`, HS256). That remains KrakenD-only.

### 3. Domain Authorization

```go
// Build authorization request
authRequest := ActiveDomainsRequest{
    ActiveDomains: extractDomainsFromToken(activeProjects),
}

// Call BriggsBase API for authorization
authorized, err := checkDomainAuthorization(authRequest, pluginID)
```

## 🔧 Plugin Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BRIGGSBASE_API_URL` | Authorization API endpoint | `http://backend-briggsbase-service...` |
| `PLUGIN_AUTH_ENABLED` | Enable/disable auth | `true` |
| `LOG_LEVEL` | Logging verbosity | `info` |

Do not introduce `JWT_SECRET` in this plugin. JWT verification uses Keycloak JWKs in `auth/validator`.

### Plugin Registration

```go
func main() {
    plugin.Register(&AuthPlugin{
        logger:    logger.New(),
        apiClient: &http.Client{Timeout: 5 * time.Second},
    })
}
```

## 🛠️ Development Patterns

### Error Handling Strategy

```go
// Standardized error responses
type AuthError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

const (
    ErrTokenMissing     = "AUTH_001"
    ErrTokenInvalid     = "AUTH_002"
    ErrDomainUnauth     = "AUTH_003"
    ErrPluginUnauth     = "AUTH_004"
)
```

### Logging Best Practices

```go
// Structured logging with context
logger.WithFields(map[string]interface{}{
    "user_id":    userID,
    "plugin_id":  pluginID,
    "domain":     domainCode,
    "action":     "authorize",
}).Info("authorization check completed")
```

### Token Processing Utilities

```go
// Base64 decode authorization token
func decodeAuthToken(encoded string) (AuthToken, error) {
    decoded, err := base64.StdEncoding.DecodeString(encoded)
    if err != nil {
        return AuthToken{}, err
    }
    
    var token AuthToken
    err = json.Unmarshal(decoded, &token)
    return token, err
}
```

## 🔗 External API Integration

### BriggsBase Authorization API

```go
// Authorization endpoint pattern
POST /api/plugins/{pluginId}/authorize

// Request payload
{
    "domains": [
        {
            "domain_code": "DOMAIN1",
            "project_code": "PROJ1",
            "roles": ["admin", "user"]
        }
    ]
}

// Response
{
    "authorized": true,
    "plugin_access": ["READ", "WRITE"],
    "restrictions": {}
}
```

### API Client Configuration

```go
type APIClient struct {
    baseURL    string
    timeout    time.Duration
    retryCount int
    client     *http.Client
}

func (c *APIClient) CheckAuthorization(ctx context.Context, req AuthRequest) (*AuthResponse, error) {
    // Implementation with retry logic and circuit breaker
}
```

## 🎯 Authorization Rules

### Domain-Based Access Control

```go
// Authorization matrix
type AuthorizationMatrix struct {
    UserDomains    []string `json:"user_domains"`
    PluginDomains  []string `json:"plugin_domains"`
    RequiredRoles  []string `json:"required_roles"`
    AccessLevel    string   `json:"access_level"`
}

// Check authorization
func (m *AuthorizationMatrix) IsAuthorized(userContext UserContext) bool {
    // Check domain overlap
    if !hasCommonDomains(m.UserDomains, userContext.Domains) {
        return false
    }
    
    // Check role requirements
    if !hasRequiredRoles(m.RequiredRoles, userContext.Roles) {
        return false
    }
    
    return true
}
```

### Route-Specific Authorization

```go
// Route authorization configuration
type RouteAuth struct {
    Path          string   `json:"path"`
    Method        string   `json:"method"`
    Authorization string   `json:"authorization"`
    RequiredRoles []string `json:"required_roles"`
}

// Authorization types
const (
    AuthNone           = "None"
    AuthBasic          = "Basic"
    AuthProjectsDomains = "ProjectsDomains"
    AuthAdminOnly      = "AdminOnly"
)
```

## 🧪 Testing Strategies

### Unit Testing

```go
func TestTokenValidation(t *testing.T) {
    plugin := &AuthPlugin{
        tokenParser: jwt.NewParser(),
        config:      testConfig,
    }
    
    tests := []struct {
        name        string
        token       string
        expected    bool
        expectError bool
    }{
        {
            name:     "valid token",
            token:    generateValidToken(),
            expected: true,
        },
        {
            name:        "expired token",
            token:       generateExpiredToken(),
            expectError: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := plugin.validateToken(tt.token)
            if tt.expectError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expected, result.Valid)
            }
        })
    }
}
```

### Integration Testing

```go
func TestAuthorizationFlow(t *testing.T) {
    // Setup mock BriggsBase API
    mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Mock authorization response
        json.NewEncoder(w).Encode(AuthResponse{
            Authorized: true,
            PluginAccess: []string{"READ", "WRITE"},
        })
    }))
    defer mockServer.Close()
    
    // Test full authorization flow
    plugin := setupTestPlugin(mockServer.URL)
    req := httptest.NewRequest("GET", "/api/test", nil)
    req.Header.Set("Authorization", "Bearer " + validToken)
    
    result, err := plugin.processRequest(req)
    assert.NoError(t, err)
    assert.True(t, result.Authorized)
}
```

## 🚨 Error Scenarios & Handling

### Common Error Patterns

```go
// Token validation errors
var (
    ErrTokenExpired    = errors.New("token has expired")
    ErrTokenMalformed  = errors.New("token is malformed")
    ErrTokenMissing    = errors.New("authorization token missing")
    ErrInvalidSignature = errors.New("token signature invalid")
)

// Authorization errors
var (
    ErrDomainMismatch   = errors.New("user domain does not match plugin domain")
    ErrInsufficientRole = errors.New("user lacks required role")
    ErrPluginNotFound   = errors.New("plugin configuration not found")
    ErrAPIUnavailable   = errors.New("authorization API unavailable")
)
```

### Error Response Format

```go
type ErrorResponse struct {
    Error     string    `json:"error"`
    Code      string    `json:"code"`
    Timestamp time.Time `json:"timestamp"`
    RequestID string    `json:"request_id"`
    Details   string    `json:"details,omitempty"`
}

func (p *AuthPlugin) handleError(err error, requestID string) ErrorResponse {
    return ErrorResponse{
        Error:     err.Error(),
        Code:      mapErrorToCode(err),
        Timestamp: time.Now().UTC(),
        RequestID: requestID,
    }
}
```

## 📊 Monitoring & Observability

### Metrics Collection

```go
// Plugin metrics
type AuthMetrics struct {
    RequestsTotal      prometheus.Counter
    AuthorizationTime  prometheus.Histogram
    ErrorsTotal        prometheus.Counter
    TokenValidationTime prometheus.Histogram
}

// Metric registration
func (p *AuthPlugin) registerMetrics() {
    p.metrics.RequestsTotal = prometheus.NewCounter(prometheus.CounterOpts{
        Name: "auth_plugin_requests_total",
        Help: "Total number of authentication requests",
    })
    prometheus.MustRegister(p.metrics.RequestsTotal)
}
```

### Structured Logging

```go
// Log entry structure
type LogEntry struct {
    Level     string                 `json:"level"`
    Message   string                 `json:"message"`
    Timestamp time.Time             `json:"timestamp"`
    UserID    string                 `json:"user_id,omitempty"`
    PluginID  string                 `json:"plugin_id,omitempty"`
    Action    string                 `json:"action"`
    Duration  time.Duration          `json:"duration,omitempty"`
    Fields    map[string]interface{} `json:"fields,omitempty"`
}
```

## 🔄 Plugin Lifecycle

### Initialization

```go
func (p *AuthPlugin) Initialize(config map[string]interface{}) error {
    // Load configuration
    if err := p.loadConfig(config); err != nil {
        return fmt.Errorf("failed to load config: %w", err)
    }
    
    // Initialize HTTP client
    p.apiClient = &http.Client{
        Timeout: time.Duration(p.config.APITimeout) * time.Second,
    }
    
    // Setup metrics
    p.registerMetrics()
    
    return nil
}
```

### Graceful Shutdown

```go
func (p *AuthPlugin) Shutdown(ctx context.Context) error {
    // Close HTTP client connections
    if p.apiClient != nil {
        p.apiClient.CloseIdleConnections()
    }
    
    // Flush metrics
    if p.metricsRegistry != nil {
        p.metricsRegistry.Unregister(p.metrics.RequestsTotal)
    }
    
    return nil
}
```

## 🛡️ Security Considerations

### JWT Token Security

- Always validate token signature
- Check token expiration
- Verify issuer and audience claims
- Use secure JWT secret storage
- Implement token blacklisting for logout

### API Communication Security

- Use HTTPS for external API calls
- Implement request signing
- Add rate limiting for API calls
- Use circuit breaker pattern
- Sanitize all input data

### Plugin Isolation

- Run with minimal required permissions
- Isolate plugin memory space
- Limit file system access
- Implement secure configuration loading
- Use structured logging for audit trails

## 📚 Reference Implementation

The complete auth plugin implementation can be found in:
- `/auth-plugin/main.go` - Core plugin logic
- `/auth-plugin/utils.go` - Utility functions
- `/auth-plugin/errors.go` - Error definitions

For configuration examples, see:
- `/settings/plugins.json.example` - Plugin configuration schema
- `/templates/auth-validator.tmpl` - KrakenD auth validation template

---

**Related Documentation:**
- `krakend-dynamic-plugins.md` - Plugin discovery system
- `krakend-template-system.md` - Template configuration
- `authentication-architecture-principles.md` - Security architecture
