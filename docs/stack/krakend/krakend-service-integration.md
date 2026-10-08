# KrakenD Service Integration Patterns

**Last Updated:** June 15, 2025  
**Integration Version:** 2.0  
**Stack:** KrakenD Gateway  

## Overview

The KrakenD Gateway serves as the central integration hub for all microservices in the Briggs System architecture. This guide covers service discovery, routing patterns, communication protocols, and integration best practices.

## 🏗️ Service Architecture

### Service Discovery Model

```yaml
# Kubernetes service discovery pattern
services:
  backend-briggsbase:
    host: backend-briggsbase-service.briggsbase.svc.cluster.local
    port: 8080
    protocol: http
    
  backend-cdc:
    host: backend-cdc-service.briggsbase.svc.cluster.local  
    port: 8080
    protocol: http
    
  frontend-react:
    host: frontend-react-service.briggsbase.svc.cluster.local
    port: 3000
    protocol: http
    
  keycloak:
    host: keycloak-service.briggsbase.svc.cluster.local
    port: 8080
    protocol: http
```

### Service Configuration Schema

```json
{
  "services": {
    "briggsbase": {
      "host": "backend-briggsbase-service.briggsbase.svc.cluster.local",
      "port": 8080,
      "timeout": "30s",
      "retry_count": 3,
      "health_check": "/health",
      "load_balancing": "round_robin"
    },
    "cdc": {
      "host": "backend-cdc-service.briggsbase.svc.cluster.local",
      "port": 8080,
      "timeout": "30s",
      "retry_count": 3,
      "health_check": "/health"
    }
  }
}
```

## 🔀 Routing Patterns

### Domain-Based Routing

```json
{
  "endpoint": "/api/{domain}/{project}/{plugin}/{path}",
  "method": "ANY",
  "backend": [
    {
      "url_pattern": "/api/plugins/{plugin}/{path}",
      "host": ["backend-briggsbase-service.briggsbase.svc.cluster.local:8080"],
      "method": "{{.Req.Method}}",
      "extra_config": {
        "modifier/jmespath": {
          "expr": "{domain: \"{{.Req.Params.domain}}\", project: \"{{.Req.Params.project}}\", plugin: \"{{.Req.Params.plugin}}\", data: @}"
        }
      }
    }
  ]
}
```

### Service-Specific Routing

```json
// BriggsBase API routes
{
  "endpoint": "/api/briggsbase/{path}",
  "backend": [
    {
      "url_pattern": "/{path}",
      "host": ["backend-briggsbase-service.briggsbase.svc.cluster.local:8080"]
    }
  ]
},

// CDC API routes  
{
  "endpoint": "/api/cdc/{path}",
  "backend": [
    {
      "url_pattern": "/{path}",
      "host": ["backend-cdc-service.briggsbase.svc.cluster.local:8080"]
    }
  ]
},

// Frontend asset routes
{
  "endpoint": "/app/{path}",
  "backend": [
    {
      "url_pattern": "/{path}",
      "host": ["frontend-react-service.briggsbase.svc.cluster.local:3000"]
    }
  ]
}
```

### Plugin-Dynamic Routing

```json
{
  "endpoint": "/api/{{.DomainCode}}/{{.ProjectCode}}/{{.PluginID}}/{path}",
  "backend": [
    {
      "url_pattern": "/api/plugins/{{.PluginID}}/{path}",
      "host": ["{{.BackendHost}}"],
      "extra_config": {
        "plugin/http-server": {
          "name": ["auth-plugin"],
          "auth-plugin": {
            "plugin_id": "{{.PluginID}}",
            "domain_code": "{{.DomainCode}}",
            "project_code": "{{.ProjectCode}}"
          }
        }
      }
    }
  ]
}
```

## 🔗 Service Communication Protocols

### HTTP/REST Communication

```json
// Standard HTTP backend configuration
{
  "backend": [
    {
      "url_pattern": "/api/endpoint",
      "host": ["service-host:8080"],
      "method": "GET",
      "encoding": "json",
      "timeout": "30s",
      "headers_to_pass": ["Authorization", "X-User-ID", "Content-Type"],
      "extra_config": {
        "backend/http": {
          "return_error_details": "error"
        }
      }
    }
  ]
}
```

### GraphQL Integration

```json
{
  "endpoint": "/graphql",
  "method": "POST",
  "backend": [
    {
      "url_pattern": "/graphql",
      "host": ["graphql-service:4000"],
      "method": "POST",
      "encoding": "json",
      "extra_config": {
        "modifier/jmespath": {
          "expr": "{query: @.query, variables: @.variables, operationName: @.operationName}"
        }
      }
    }
  ]
}
```

### WebSocket Integration

```json
{
  "endpoint": "/ws/{path}",
  "backend": [
    {
      "url_pattern": "/ws/{path}",
      "host": ["websocket-service:8080"],
      "disable_host_sanitize": true,
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_alias"
        }
      }
    }
  ]
}
```

## 🔐 Authentication Integration

### Keycloak Integration Pattern

```json
{
  "endpoint": "/auth/{path}",
  "backend": [
    {
      "url_pattern": "/{path}",
      "host": ["keycloak-service.briggsbase.svc.cluster.local:8080"],
      "encoding": "json"
    }
  ],
  "extra_config": {
    "modifier/jmespath": {
      "expr": "@"
    }
  }
},
{
  "endpoint": "/auth/token",
  "method": "POST",
  "backend": [
    {
      "url_pattern": "/realms/briggsbase/protocol/openid-connect/token",
      "host": ["keycloak-service.briggsbase.svc.cluster.local:8080"],
      "method": "POST",
      "encoding": "form"
    }
  ]
}
```

### JWT Propagation Pattern

```json
{
  "extra_config": {
    "auth/validator": {
      "alg": "RS256",
      "jwk_url": "http://keycloak-service:8080/realms/briggs/protocol/openid-connect/certs",
      "propagate_claims": [
        ["sub", "x-sub"],
        ["email", "x-email"],
        ["realm_access.roles", "x-user-roles"],
        ["domain", "x-user-domain"]
      ]
    }
  }
}
```

## 📊 Load Balancing & Health Checks

### Multi-Backend Load Balancing

```json
{
  "backend": [
    {
      "url_pattern": "/api/endpoint",
      "host": [
        "service-replica-1:8080",
        "service-replica-2:8080", 
        "service-replica-3:8080"
      ],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_alias"
        }
      }
    }
  ],
  "extra_config": {
    "qos/circuit-breaker": {
      "interval": 60,
      "timeout": 10,
      "max_errors": 5,
      "name": "service-circuit-breaker"
    }
  }
}
```

### Health Check Configuration

```json
{
  "endpoint": "/health/{service}",
  "backend": [
    {
      "url_pattern": "/health",
      "host": ["{{.Service}}-service:8080"],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "all"
        }
      }
    }
  ],
  "extra_config": {
    "modifier/jmespath": {
      "expr": "{service: \"{{.Req.Params.service}}\", status: @.status, timestamp: @.timestamp}"
    }
  }
}
```

## 🔄 Data Transformation Patterns

### Request Transformation

```json
{
  "extra_config": {
    "modifier/jmespath": {
      "expr": "{
        user_id: @.headers['X-User-ID'][0],
        domain: @.params.domain,
        project: @.params.project,
        body: @.req_body,
        query: @.req_querystring
      }"
    }
  }
}
```

### Response Transformation

```json
{
  "extra_config": {
    "modifier/jmespath": {
      "expr": "{
        data: @.data,
        meta: {
          total: @.total,
          page: @.page,
          timestamp: `now()`
        },
        links: {
          self: `/api/{{.domain}}/{{.project}}/{{.plugin}}`,
          next: @.next_page_url
        }
      }"
    }
  }
}
```

### Error Response Standardization

```json
{
  "extra_config": {
    "modifier/jmespath": {
      "expr": "{
        error: @.error || 'Unknown error',
        code: @.error_code || 'UNKNOWN',
        message: @.message || 'An error occurred',
        timestamp: `now()`,
        request_id: @.headers['X-Request-ID'][0]
      }"
    }
  }
}
```

## 🔍 Service Monitoring Integration

### Metrics Collection

```json
{
  "extra_config": {
    "telemetry/metrics": {
      "collection_time": "60s",
      "proxy_disabled": false,
      "router_disabled": false,
      "backend_disabled": false,
      "endpoint_disabled": false,
      "listen_address": ":8090"
    }
  }
}
```

### Distributed Tracing

```json
{
  "extra_config": {
    "telemetry/opencensus": {
      "sample_rate": 100,
      "reporting_period": 1,
      "enabled_layers": {
        "backend": true,
        "router": true,
        "pipe": true
      },
      "exporters": {
        "jaeger": {
          "endpoint": "http://jaeger-collector:14268/api/traces",
          "service_name": "krakend-gateway"
        }
      }
    }
  }
}
```

### Logging Integration

```json
{
  "extra_config": {
    "telemetry/logging": {
      "level": "INFO",
      "prefix": "[KRAKEND]",
      "syslog": false,
      "stdout": true,
      "format": "json",
      "custom_format": "{\"timestamp\":\"{{.Timestamp}}\",\"level\":\"{{.Level}}\",\"message\":\"{{.Message}}\",\"service\":\"krakend-gateway\"}"
    }
  }
}
```

## 🛡️ Security Integration Patterns

### Rate Limiting by Service

```json
{
  "extra_config": {
    "qos/ratelimit/router": {
      "max_rate": 1000,
      "client_max_rate": 100,
      "strategy": "header",
      "key": "X-User-ID",
      "capacity": 1000,
      "every": "1m"
    }
  }
}
```

### CORS Configuration

```json
{
  "extra_config": {
    "security/cors": {
      "allow_origins": [
        "https://frontend.briggsbase.com",
        "https://admin.briggsbase.com"
      ],
      "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allow_headers": [
        "Origin",
        "Authorization", 
        "Content-Type",
        "X-User-ID",
        "X-Domain-Code"
      ],
      "expose_headers": ["X-Request-ID"],
      "max_age": "12h",
      "allow_credentials": true
    }
  }
}
```

### Security Headers

```json
{
  "extra_config": {
    "security/http": {
      "allowed_hosts": ["gateway.briggsbase.com"],
      "ssl_redirect": true,
      "ssl_host": "gateway.briggsbase.com",
      "sts_seconds": 31536000,
      "sts_include_subdomains": true,
      "frame_deny": true,
      "content_type_nosniff": true,
      "browser_xss_filter": true,
      "content_security_policy": "default-src 'self'; script-src 'self' 'unsafe-inline'"
    }
  }
}
```

## 🔧 Service Configuration Management

### Environment-Based Configuration

```go
// Service configuration loader
type ServiceConfig struct {
    Environment string            `json:"environment"`
    Services    map[string]Service `json:"services"`
    Timeouts    TimeoutConfig     `json:"timeouts"`
    Security    SecurityConfig    `json:"security"`
}

func loadServiceConfig(env string) (*ServiceConfig, error) {
    configFile := fmt.Sprintf("/config/services-%s.json", env)
    
    data, err := ioutil.ReadFile(configFile)
    if err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }
    
    var config ServiceConfig
    if err := json.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("failed to parse config: %w", err)
    }
    
    return &config, nil
}
```

### Dynamic Service Discovery

```go
// Kubernetes service discovery
func discoverServices(namespace string) (map[string]Service, error) {
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }
    
    services, err := clientset.CoreV1().Services(namespace).List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return nil, err
    }
    
    discovered := make(map[string]Service)
    for _, svc := range services.Items {
        service := Service{
            Name: svc.Name,
            Host: fmt.Sprintf("%s.%s.svc.cluster.local", svc.Name, namespace),
            Port: int(svc.Spec.Ports[0].Port),
        }
        discovered[svc.Name] = service
    }
    
    return discovered, nil
}
```

## 🧪 Integration Testing Patterns

### Service Health Verification

```go
func TestServiceHealth(t *testing.T) {
    services := []string{"briggsbase", "cdc", "keycloak"}
    
    for _, service := range services {
        t.Run(service, func(t *testing.T) {
            url := fmt.Sprintf("http://gateway:8080/health/%s", service)
            resp, err := http.Get(url)
            
            assert.NoError(t, err)
            assert.Equal(t, http.StatusOK, resp.StatusCode)
            
            var health HealthResponse
            err = json.NewDecoder(resp.Body).Decode(&health)
            assert.NoError(t, err)
            assert.Equal(t, "healthy", health.Status)
        })
    }
}
```

### End-to-End Integration Tests

```go
func TestPluginEndpointIntegration(t *testing.T) {
    // Setup test data
    token := generateTestToken()
    pluginID := "test-plugin"
    
    // Test plugin endpoint
    req, _ := http.NewRequest("GET", 
        fmt.Sprintf("http://gateway:8080/api/TEST/PROJ1/%s/health", pluginID), nil)
    req.Header.Set("Authorization", "Bearer "+token)
    
    resp, err := http.DefaultClient.Do(req)
    assert.NoError(t, err)
    assert.Equal(t, http.StatusOK, resp.StatusCode)
    
    // Verify response structure
    var response map[string]interface{}
    err = json.NewDecoder(resp.Body).Decode(&response)
    assert.NoError(t, err)
    assert.Contains(t, response, "plugin_id")
    assert.Equal(t, pluginID, response["plugin_id"])
}
```

## 📈 Performance Optimization Patterns

### Backend Response Caching

```json
{
  "extra_config": {
    "qos/http-cache": {
      "ttl": "300s",
      "cache_control": true,
      "etag": true,
      "vary": ["Authorization", "X-User-ID"]
    }
  }
}
```

### Response Compression

```json
{
  "extra_config": {
    "modifier/response-body-generator": {
      "enable_compression": true,
      "compression_level": 6,
      "min_length": 1024
    }
  }
}
```

### Connection Pooling

```json
{
  "extra_config": {
    "backend/http": {
      "idle_connections_per_host": 100,
      "max_idle_connections": 1000,
      "max_connections_per_host": 200,
      "idle_connection_timeout": "90s",
      "response_header_timeout": "30s"
    }
  }
}
```

## 🚨 Error Handling & Fallback Patterns

### Circuit Breaker Pattern

```json
{
  "extra_config": {
    "qos/circuit-breaker": {
      "interval": 60,
      "timeout": 10,
      "max_errors": 5,
      "name": "service-circuit-breaker",
      "log_status_change": true
    }
  }
}
```

### Fallback Service Configuration

```json
{
  "backend": [
    {
      "url_pattern": "/api/primary",
      "host": ["primary-service:8080"]
    },
    {
      "url_pattern": "/api/fallback", 
      "host": ["fallback-service:8080"],
      "extra_config": {
        "backend/http": {
          "return_error_details": "fallback"
        }
      }
    }
  ]
}
```

## 📚 Service Integration Reference

### Service Endpoint Patterns

| Service | Endpoint Pattern | Description |
|---------|------------------|-------------|
| BriggsBase | `/api/briggsbase/{path}` | Core business API |
| CDC | `/api/cdc/{path}` | Change data capture |
| Plugins | `/api/{domain}/{project}/{plugin}/{path}` | Dynamic plugins |
| Auth | `/auth/{path}` | Authentication endpoints |
| Health | `/health/{service}` | Service health checks |

### Common Integration Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `X-User-ID` | User identification | `123e4567-e89b-12d3` |
| `X-Domain-Code` | Domain context | `FINANCE` |
| `X-Project-Code` | Project context | `PROJ001` |
| `X-Plugin-ID` | Plugin identification | `billing-calculator` |
| `X-Request-ID` | Request tracing | `req-123456789` |

---

**Related Documentation:**
- `krakend-auth-plugin-development.md` - Custom auth plugin development
- `krakend-template-system.md` - Template configuration system
- `krakend-dynamic-plugins.md` - Plugin discovery system
- `authentication-architecture-principles.md` - Security architecture
