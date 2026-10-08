# KrakenD Stack - Common Patterns

**CANONICAL SOURCE**: KrakenD Gateway-specific configuration patterns.

## Authentication Patterns

### JWT Validation Configuration
```json
{
  "endpoint": "/api/v1/projects",
  "method": "GET",
  "extra_config": {
    "auth/validator": {
      "alg": "RS256",
      "jwk_url": "https://login.briggsandwalker.com/realms/briggs/protocol/openid_connect/certs",
      "issuer": "https://login.briggsandwalker.com/realms/briggs",
      "audience": ["your-api-audience"],
      "cookie_key": "",
      "disable_jwk_security": false,
      "jwk_fingerprints": [],
      "cache": true,
      "cache_duration": 15
    }
  }
}
```

### Role-Based Authorization
```json
{
  "endpoint": "/api/v1/admin/users",
  "method": "GET",
  "extra_config": {
    "auth/validator": {
      "alg": "RS256",
      "jwk_url": "https://login.briggsandwalker.com/realms/briggs/protocol/openid_connect/certs",
      "issuer": "https://login.briggsandwalker.com/realms/briggs",
      "roles_key": "realm_access.roles",
      "roles": ["admin", "super-admin"]
    }
  }
}
```

### Domain-Based Access Control
```json
{
  "endpoint": "/api/v1/projects",
  "method": "GET",
  "extra_config": {
    "modifier/lua-backend": {
      "sources": ["domain_validator.lua"],
      "pre": "domain_validator.validate_domain_access(request, response)"
    }
  }
}
```

## Service Integration Patterns

### Backend Service Configuration
```json
{
  "endpoint": "/api/v1/projects/{id}",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/api/v1/projects/{id}",
      "host": ["http://projects-api:8080"],
      "method": "GET",
      "encoding": "json",
      "timeout": "30s",
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_error"
        }
      }
    }
  ],
  "extra_config": {
    "proxy": {
      "sequential": false
    }
  }
}
```

### Multi-Backend Aggregation
```json
{
  "endpoint": "/api/v1/dashboard/{project_id}",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/api/v1/projects/{project_id}",
      "host": ["http://projects-api:8080"],
      "method": "GET",
      "mapping": {
        "project": "."
      }
    },
    {
      "url_pattern": "/api/v1/crew?project_id={project_id}",
      "host": ["http://crew-api:8080"],
      "method": "GET",
      "mapping": {
        "crew": "."
      }
    },
    {
      "url_pattern": "/api/v1/tasks?project_id={project_id}",
      "host": ["http://planning-api:8080"],
      "method": "GET",
      "mapping": {
        "tasks": "."
      }
    }
  ],
  "extra_config": {
    "proxy": {
      "sequential": false
    }
  }
}
```

## Rate Limiting Patterns

### Global Rate Limiting
```json
{
  "extra_config": {
    "qos/ratelimit/service": {
      "max_rate": 100,
      "capacity": 200,
      "client_max_rate": 10,
      "client_capacity": 20
    }
  }
}
```

### Endpoint-Specific Rate Limiting
```json
{
  "endpoint": "/api/v1/heavy-operation",
  "method": "POST",
  "extra_config": {
    "qos/ratelimit/router": {
      "max_rate": 5,
      "capacity": 10,
      "client_max_rate": 1,
      "client_capacity": 2,
      "key": "X-User-ID"
    }
  }
}
```

### IP-Based Rate Limiting
```json
{
  "endpoint": "/api/v1/public-data",
  "method": "GET",
  "extra_config": {
    "qos/ratelimit/router": {
      "max_rate": 50,
      "capacity": 100,
      "client_max_rate": 5,
      "client_capacity": 10,
      "key": "client_ip"
    }
  }
}
```

## Caching Patterns

### Response Caching
```json
{
  "endpoint": "/api/v1/lookup/countries",
  "method": "GET",
  "cache_ttl": "24h",
  "backend": [
    {
      "url_pattern": "/api/v1/countries",
      "host": ["http://lookup-api:8080"],
      "method": "GET"
    }
  ]
}
```

### Backend-Specific Caching
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/expensive-operation",
      "host": ["http://api:8080"],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_error"
        },
        "modifier/martian": {
          "header.Modifier": {
            "scope": ["response"],
            "name": "Cache-Control",
            "value": "public, max-age=3600"
          }
        }
      }
    }
  ]
}
```

## CORS Configuration Patterns

### Basic CORS Setup
```json
{
  "extra_config": {
    "security/cors": {
      "allow_origins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://app.briggsandwalker.com"
      ],
      "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allow_headers": ["Authorization", "Content-Type", "X-Requested-With"],
      "expose_headers": ["Content-Length"],
      "max_age": "12h",
      "allow_credentials": true
    }
  }
}
```

### Environment-Specific CORS
```json
{
  "extra_config": {
    "security/cors": {
      "allow_origins": ["{{ .ALLOWED_ORIGINS }}"],
      "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allow_headers": ["Authorization", "Content-Type"],
      "allow_credentials": true
    }
  }
}
```

## Load Balancing Patterns

### Round-Robin Load Balancing
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/projects",
      "host": [
        "http://projects-api-1:8080",
        "http://projects-api-2:8080",
        "http://projects-api-3:8080"
      ],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_error"
        }
      }
    }
  ]
}
```

### Weighted Load Balancing
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/projects",
      "host": ["http://projects-api-1:8080"],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_error"
        }
      }
    },
    {
      "url_pattern": "/api/v1/projects",
      "host": ["http://projects-api-2:8080"],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_error"
        }
      }
    }
  ],
  "extra_config": {
    "proxy": {
      "sequential": false
    }
  }
}
```

## Request/Response Transformation

### Request Header Modification
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/projects",
      "host": ["http://projects-api:8080"],
      "method": "GET",
      "extra_config": {
        "modifier/martian": {
          "header.Modifier": {
            "scope": ["request"],
            "name": "X-Source",
            "value": "gateway"
          }
        }
      }
    }
  ]
}
```

### Response Field Filtering
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/users/{id}",
      "host": ["http://users-api:8080"],
      "method": "GET",
      "deny": ["password", "internal_notes", "admin_flags"],
      "allow": ["id", "name", "email", "roles"]
    }
  ]
}
```

### Response Field Mapping
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/legacy/projects",
      "host": ["http://legacy-api:8080"],
      "method": "GET",
      "mapping": {
        "projects": "data.items",
        "total": "data.pagination.total",
        "page": "data.pagination.current_page"
      }
    }
  ]
}
```

## Circuit Breaker Patterns

### Basic Circuit Breaker
```json
{
  "backend": [
    {
      "url_pattern": "/api/v1/external-service",
      "host": ["http://external-api:8080"],
      "method": "GET",
      "extra_config": {
        "qos/circuit-breaker": {
          "interval": 60,
          "timeout": 10,
          "max_errors": 5,
          "name": "external-service-cb",
          "log_status_change": true
        }
      }
    }
  ]
}
```

### Circuit Breaker with Fallback
```json
{
  "endpoint": "/api/v1/recommendations",
  "method": "GET",
  "backend": [
    {
      "url_pattern": "/api/v1/recommendations",
      "host": ["http://recommendations-api:8080"],
      "method": "GET",
      "extra_config": {
        "qos/circuit-breaker": {
          "interval": 60,
          "timeout": 10,
          "max_errors": 3
        }
      }
    },
    {
      "url_pattern": "/api/v1/fallback/recommendations",
      "host": ["http://cache-api:8080"],
      "method": "GET",
      "extra_config": {
        "proxy": {
          "shadow": true
        }
      }
    }
  ]
}
```

## Security Patterns

### Security Headers
```json
{
  "extra_config": {
    "security/http": {
      "allowed_hosts": ["localhost:8080", "gateway.briggsandwalker.com"],
      "ssl_redirect": true,
      "ssl_host": "gateway.briggsandwalker.com",
      "sts_seconds": 31536000,
      "sts_include_subdomains": true,
      "frame_deny": true,
      "content_type_nosniff": true,
      "browser_xss_filter": true,
      "content_security_policy": "default-src 'self'",
      "referrer_policy": "strict-origin-when-cross-origin"
    }
  }
}
```

### IP Filtering
```json
{
  "endpoint": "/api/v1/admin/system",
  "method": "GET",
  "extra_config": {
    "security/ip-filter": {
      "allow": ["192.168.1.0/24", "10.0.0.0/8"],
      "deny": ["192.168.1.100"]
    }
  }
}
```

## Monitoring and Observability

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

### Request Logging
```json
{
  "extra_config": {
    "telemetry/logging": {
      "level": "INFO",
      "prefix": "[KRAKEND]",
      "syslog": false,
      "stdout": true,
      "format": "json"
    }
  }
}
```

### Health Check Configuration
```json
{
  "endpoint": "/health",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/__health",
      "host": ["http://localhost:8080"],
      "method": "GET",
      "extra_config": {
        "backend/http": {
          "return_error_details": "all"
        }
      }
    }
  ]
}
```
