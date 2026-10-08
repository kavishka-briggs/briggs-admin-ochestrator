# KrakenD API Gateway Architecture Principles and Best Practices

**Quick Navigation:**
- **Basic Config & Commands**: See `krakend-quick-reference.md`
- **Integration Patterns**: See `krakend-patterns.md` for API Gateway patterns
- **Gateway Issues**: See `krakend-troubleshooting.md` for KrakenD-specific problems
- **🔐 Authentication Architecture**: See [`../../authentication-architecture-principles.md`](../../authentication-architecture-principles.md)
- **Advanced Implementation Guides**:
  - **Auth Plugin Development**: See `krakend-auth-plugin-development.md`
  - **Template System**: See `krakend-template-system.md`
  - **Service Integration**: See `krakend-service-integration.md`
  - **Performance Monitoring**: See `krakend-performance-monitoring.md`
  - **Dynamic Plugins**: See `krakend-dynamic-plugins.md`

This document outlines the architecture principles and best practices for the KrakenD API Gateway within the Briggs System ecosystem. These guidelines ensure consistency, security, maintainability, and optimal performance for the gateway that orchestrates communication between microfrontends and microservices.

## Project Structure and Organization

### Gateway Architecture Pattern

The KrakenD Gateway follows a **centralized API Gateway pattern** with modular configuration and plugin-based extensibility:

```
project-root/
├── krakend.json             # Main gateway configuration
├── Dockerfile               # Multi-stage container build
├── Dockerfile.check         # Validation container build
├── docker-compose.yaml      # Local development setup
├── entrypoint.sh           # Dynamic configuration loading
├── auth-plugin/            # Custom authentication plugin
│   ├── main.go             # Plugin implementation
│   ├── utils.go            # Utility functions
│   ├── errors.go           # Error handling
│   └── go.mod              # Go module definition
├── templates/              # Configuration templates
│   ├── index.tmpl          # Main endpoint aggregation
│   ├── keycloak.tmpl       # Keycloak authentication
│   ├── auth-validator.tmpl # JWT validation
│   ├── plugins.tmpl        # Dynamic plugin routes
│   ├── rate-limitor.tmpl   # Rate limiting configuration
│   ├── bw-*.tmpl           # Service-specific templates
│   └── *.tmpl              # Additional service templates
├── settings/               # Environment configurations
│   ├── service.json        # Service host mappings
│   └── plugins.json.example # Plugin configuration template
├── docs/                   # Architecture documentation
│   ├── ai-quick-start.md   # AI agent quick reference
│   ├── application-architecture.md
│   ├── domain-architecture.md
│   ├── repository-overview.md
│   ├── workflow-setup.md
│   └── stack/              # Technology-specific guides
│       ├── krakend/        # KrakenD-specific documentation
│       ├── react/          # React patterns (shared)
│       └── dotnet/         # .NET patterns (shared)
└── helm/                   # Kubernetes deployment
    ├── Chart.yaml          # Helm chart definition
    ├── values-dev.yaml     # Development environment values
    ├── values-eu.yaml      # EU production environment values
    └── templates/          # Kubernetes manifests
        ├── deployment.yaml
        ├── service.yaml
        └── ingress.yaml
```

### Key Architectural Principles

1. **Centralized Gateway**: Single entry point for all client requests
2. **Template-Driven Configuration**: Modular, reusable endpoint definitions
3. **Plugin-Based Authentication**: Custom Go plugins for complex auth logic
4. **Dynamic Route Discovery**: Runtime configuration from external sources
5. **Environment Isolation**: Separate configurations per deployment environment

## Configuration Management

### Template-Based Configuration

Use Go templates for modular and maintainable configuration:

```go
// Main configuration aggregation
{{define "Endpoint"}}
{{ template "KeycloakEndpoint" .service.keycloakHost }},
{{ template "ActivityMapEndpoint" .service.activityMapHost }},
{{ template "BriggsAndWalkerWebAPICoreEndpoint" .service.webAPICoreHost }},
{{ template "BriggsAndWalkerASWebAPICoreEndpoint" .service.asWebAPICoreHost }},
{{ template "BriggsAndWalkerLoggingAPI" .service.loggingAPI }}
{{ template "Plugins" (dict "plugins" .plugins.plugins "authHost" .service.authAPI "briggsbaseHost" .service.briggsbaseHost) }}
{{end}}
```

### Environment-Specific Configurations

The gateway supports multiple deployment environments with dedicated Helm values files:

**Development Environment** (`helm/values-dev.yaml`):
- Local development and testing
- Debug mode enabled
- Relaxed security settings for development

**EU Production Environment** (`helm/values-eu.yaml`):
- Production deployment for European region
- Hostname: `https://gateway.briggsandwalker.com/`
- TLS certificate: `ingress-tls`
- Keycloak URL: `https://login.briggsandwalker.com`
- Container registry: `briggswalkeracr.azurecr.io/krakend`

```json
// settings/service.json - Service discovery
{
    "keycloakHost": "http://keycloak.keycloak.svc.cluster.local",
    "webAPICoreHost": "http://bw-webapi-core.default.svc.cluster.local:8080",
    "activityMapHost": "http://bw-activitymap-api.default.svc.cluster.local:8080",
    "asWebAPICoreHost": "http://bw-as-webapi-core.default.svc.cluster.local:80",
    "authAPI": "http://backend-pttn-authapi-service.backend-pttn-authapi.svc.cluster.local:8080",
    "loggingAPI": "http://backend-logging-service.backend-logging.svc.cluster.local:8080",
    "briggsbaseHost": "http://backend-briggsbase-service.backend-briggsbase.svc.cluster.local:8080"
}
```

### Dynamic Plugin Configuration

Implement runtime plugin discovery through external API calls:

```bash
# entrypoint.sh - Dynamic configuration loading
echo "Getting plugin settings from $PLUGIN_SETTINGS_URL"
rm -f settings/*
cp /settings/* settings
wget $PLUGIN_SETTINGS_URL -O settings/plugins.json
echo "Starting KrakenD"
krakend run -c krakend.json -d
```

## Authentication and Authorization

### Multi-Layer Security Architecture

> 🔐 **CRITICAL: KrakenD-Only Authentication Architecture**
>
> In the Briggs System, **ONLY KrakenD validates JWT tokens**. Backend services receive pre-authenticated requests and should NOT implement JWT validation.
>
> **Correct Flow:**
> ```
> Frontend → KrakenD (JWT Validation) → Backend Service (Trusted Request)
> ```
>
> **❌ INCORRECT:** Backend services validating JWT tokens directly  
> **✅ CORRECT:** Backend services trusting KrakenD and extracting user context from headers

Implement comprehensive security through multiple authentication layers at the gateway level:

1. **JWT Validation**: Keycloak-based token verification (KrakenD only)
2. **Custom Auth Plugin**: Domain and project-level authorization (KrakenD only)
3. **Rate Limiting**: Request throttling per endpoint
4. **CORS Configuration**: Cross-origin request security
5. **Claims Propagation**: User context passed to backend services via headers

### JWT Validation Configuration

> **ONLY KrakenD validates JWT tokens** - Backend services receive pre-authenticated requests

```yaml
# auth-validator.tmpl
"auth/validator": {
    "alg": "RS256",
    "jwk_url": "{{ env "KEYCLOAK_URL" }}/realms/{{ env "KEYCLOAK_REALM" }}/protocol/openid-connect/certs",
    "disable_jwk_security": true,
    "propagate_claims": [
        ["sub","x-sub"],
        ["realm_access.roles","x-user-roles"],
        ["domain","x-user-domain"]
    ]
}
```

**Claims Propagation**: KrakenD extracts claims from validated JWT tokens and passes user context to backend services via HTTP headers. Backend services should extract user information from these headers, not from JWT tokens.

### Custom Authentication Plugin

Develop Go plugins for complex authorization logic:

```go
// auth-plugin/main.go
type ActiveProjectsTokenItem struct {
    ProjectCode string   `json:"p"`
    DomainCode  string   `json:"d"`
    Roles       []string `json:"r"`
}

type ActiveProjectsToken struct {
    ActiveProjects []ActiveProjectsTokenItem `json:"e"`
}

// Plugin implements domain-specific authorization
func (m ModifierRegisterer) registerModifiers(f func(
    name string,
    modifierFactory func(map[string]interface{}) func(interface{}) (interface{}, error),
    appliesToRequest bool,
    appliesToResponse bool,
)) {
    // Custom authorization logic implementation
}
```

### Authorization Best Practices

1. **Domain Isolation**: Enforce tenant-specific data access
2. **Role-Based Access**: Implement fine-grained permissions
3. **Token Propagation**: Pass authentication context to backend services
4. **Security Headers**: Configure appropriate security headers

## Service Integration Patterns

### Backend Service Discovery

Use Kubernetes service discovery for internal communication:

```go
// Service mapping pattern
{
    "backend": [
        {
            "host": ["{{ $host }}"],
            "url_pattern": "/api/endpoint",
            "extra_config": {
                "backend/http": {
                    "return_error_code": true
                }
            }
        }
    ]
}
```

### Request/Response Transformation

Implement data transformation at the gateway level:

```json
{
    "endpoint": "/api/v2/projects",
    "output_encoding": "json",
    "method": "GET",
    "input_headers": ["Authorization", "Content-Type", "x-sub"],
    "input_query_strings": ["*"],
    "backend": [{
        "url_pattern": "/projects",
        "host": ["{{ .service.webAPICoreHost }}"]
    }]
}
```

### Error Handling Strategy

Configure comprehensive error handling:

```json
{
    "extra_config": {
        "backend/http": {
            "return_error_code": true
        }
    }
}
```

## Performance and Scalability

### Caching Strategy

Implement intelligent caching for optimal performance:

```json
{
    "cache_ttl": "300s",
    "timeout": "30s"
}
```

### Rate Limiting

Configure rate limiting to protect backend services:

```yaml
# rate-limitor.tmpl
"qos/ratelimit/router": {
    "max_rate": 100,
    "capacity": 100
}
```

### Monitoring and Observability

Enable comprehensive monitoring:

```json
{
    "telemetry/opentelemetry": {
        "service_name": "krakend_api_service",
        "metric_reporting_period": 1,
        "exporters": {
            "prometheus": [{
                "port": 7001,
                "name": "prometheus_krakend_api_service",
                "process_metrics": true,
                "go_metrics": true
            }]
        }
    }
}
```

## Container and Deployment

### Multi-Stage Docker Build

Use multi-stage builds for optimal container images:

```dockerfile
# Build custom plugin
FROM krakend/builder:2.9.4 as builder
COPY ./auth-plugin /app
WORKDIR /app
RUN go build -buildmode=plugin -o auth-plugin.so .

# Build configuration
FROM krakend:2.9.4 as configbuilder
WORKDIR /etc/krakend/
RUN mkdir config
COPY krakend.json .
COPY settings settings
COPY templates templates
ENV FC_SETTINGS="/etc/krakend/settings"
ENV FC_TEMPLATES="/etc/krakend/templates"
ENV FC_ENABLE=1
RUN krakend check -dd --config krakend.json

# Final runtime image
FROM krakend:2.9.4
WORKDIR /etc/krakend/
COPY --from=configbuilder /etc/krakend/ .
COPY --from=builder /app/auth-plugin.so .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
CMD ["sh","./entrypoint.sh"]
```

### Kubernetes Deployment

Configure secure and scalable Kubernetes deployments:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Values.namespace }}
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "7001"
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: {{ .Values.name }}
        image: {{ .Values.containerRegistry }}:{{ .Values.imageTag }}
        ports:
        - name: http
          containerPort: 8080
        - name: telemetry
          containerPort: 7001
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
            add: ["NET_BIND_SERVICE"]
```

### Security Hardening

1. **Container Security**: Run as non-root user with minimal privileges
2. **Read-Only Filesystem**: Prevent runtime modifications
3. **Resource Limits**: Define CPU and memory constraints
4. **Network Policies**: Restrict network access patterns

## Plugin Development Guidelines

### Custom Plugin Architecture

Follow these patterns for developing KrakenD plugins:

```go
// Plugin registration pattern
func main() {}

func init() {
    fmt.Println(string(ModifierRegisterer), "loaded!!!")
}

// Interface implementation
type ModifierRegisterer string

func (m ModifierRegisterer) registerModifiers(f func(
    name string,
    modifierFactory func(map[string]interface{}) func(interface{}) (interface{}, error),
    appliesToRequest bool,
    appliesToResponse bool,
)) {
    // Plugin logic implementation
}
```

### Plugin Best Practices

1. **Error Handling**: Implement comprehensive error handling
2. **Logging**: Use structured logging for debugging
3. **Performance**: Minimize processing overhead
4. **Testing**: Unit test plugin logic thoroughly
5. **Documentation**: Document plugin functionality and configuration

## Configuration Validation

### Pre-Deployment Validation

Always validate configuration before deployment:

```bash
# Dockerfile configuration check
RUN krakend check -dd --config krakend.json
```

### Environment-Specific Validation

Use different validation strategies per environment:

```yaml
# values-eu.yaml
hostname: https://gateway.briggsandwalker.com/
tlssecret: ingress-tls
development: "true"
keycloakUrl: "https://login.briggsandwalker.com"
keycloakRealm: "briggs"
```

## Operational Excellence

### Health Checks

Implement comprehensive health monitoring:

```yaml
# Health check endpoints for backend services
{
    "endpoint": "/HealthCheck",
    "output_encoding": "no-op",
    "method": "GET",
    "backend": [{
        "url_pattern": "/HealthCheck",
        "host": ["{{ $host }}"]
    }]
}
```

### Logging Strategy

Configure structured logging for operational visibility:

```json
{
    "telemetry/logging": {
        "level": "INFO",
        "prefix": "[KRAKEND]",
        "syslog": true,
        "stdout": true,
        "format": "logstash"
    }
}
```

### Disaster Recovery

1. **Configuration Backup**: Version control all configurations
2. **Rollback Strategy**: Quick deployment rollback procedures
3. **Monitoring Alerts**: Comprehensive alerting on failures
4. **Documentation**: Maintain operational runbooks

## Integration with Briggs System

### Microservices Orchestration

The gateway serves as the central orchestration point for:

- **Authentication Services**: Keycloak integration for user authentication
- **Core APIs**: Briggs & Walker WebAPI Core services
- **Activity Mapping**: Activity map API services
- **Logging Services**: Centralized logging infrastructure
- **Plugin Services**: Dynamic plugin-based services from Briggsbase

### Domain-Aware Routing

Implement domain-specific routing based on the Briggs System multi-tenant architecture:

```go
// Domain-aware routing in auth plugin
type ActiveDomain struct {
    DomainCode string `json:"code"`
    Id         int64  `json:"id"`
}

// Route requests based on domain context
type ActiveProjectsTokenItem struct {
    ProjectCode string   `json:"p"`
    DomainCode  string   `json:"d"`
    Roles       []string `json:"r"`
}
```

### CORS Configuration

Configure CORS for microfrontend integration:

```json
{
    "security/cors": {
        "allow_origins": ["*"],
        "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["*"],
        "expose_headers": ["*"],
        "max_age": "3600m",
        "allow_credentials": true
    }
}
```

This architecture ensures the KrakenD Gateway serves as a robust, secure, and scalable entry point for the Briggs System microservices ecosystem, providing authentication, authorization, routing, and monitoring capabilities while maintaining high performance and operational excellence.
