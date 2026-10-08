# KrakenD Stack - Quick Reference

**CANONICAL SOURCE**: KrakenD Gateway-specific configuration and setup.

## 🔐 **Authentication Authority**

> **KrakenD is the ONLY JWT validator**: [`../../authentication-architecture-principles.md`](../../authentication-architecture-principles.md)
>
> Configure `propagate_claims` to pass user context to backend services

## 1. KrakenD Ports & URLs

| Service | Development | Container | Notes |
|---------|-------------|-----------|--------|
| KrakenD Gateway | 8080 | 8080 | Standard gateway port |

### Development URLs
```bash
Gateway:          http://localhost:8080
Health Check:     http://localhost:8080/__health
Debug Endpoint:   http://localhost:8080/__debug
Stats:            http://localhost:8080/__stats
```

## 2. Environment Variables

### Required Variables
```bash
# Service Discovery
PROJECTS_API_URL=http://projects-api:8080
CREW_API_URL=http://crew-api:8080
AUTH_API_URL=http://backend-pttn-authapi-service.backend-pttn-authapi.svc.cluster.local:8080

# Authentication (split base URL + realm; see krakend-architecture.md)
KEYCLOAK_URL=https://login.briggsandwalker.com
KEYCLOAK_REALM=briggs

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Optional Variables
```bash
# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_MAX_RATE=100
RATE_LIMIT_CAPACITY=200

# Cache TTL
CACHE_TTL=300s
```

## 3. Common Commands

### Development
```bash
# Start KrakenD with config
krakend run -c krakend.json

# Check configuration
krakend check -c krakend.json

# Generate configuration
krakend generate -c krakend.json

# Test endpoint
curl http://localhost:8080/__health
```

### Docker
```bash
# Build KrakenD image
docker build -t krakend-gateway .

# Run container
docker run -p 8080:8080 -v $(pwd)/krakend.json:/etc/krakend/krakend.json krakend-gateway

# Run with environment file
docker run --env-file .env -p 8080:8080 krakend-gateway
```

## 4. Configuration Structure

### Basic krakend.json
```json
{
  "version": 3,
  "name": "Briggs Gateway",
  "port": 8080,
  "host": ["http://localhost:8080"],
  "timeout": "30s",
  "cache_ttl": "300s",
  "output_encoding": "json",
  "extra_config": {
    "security/cors": {
      "allow_origins": ["http://localhost:3000", "http://localhost:5173"],
      "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allow_headers": ["Authorization", "Content-Type", "X-Requested-With"],
      "expose_headers": ["Content-Length"],
      "max_age": "12h",
      "allow_credentials": true
    }
  },
  "endpoints": []
}
```

### Standard Endpoint Pattern
```json
{
  "endpoint": "/api/v1/projects",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/api/v1/projects",
      "host": ["http://projects-api:8080"],
      "method": "GET",
      "encoding": "json"
    }
  ],
  "extra_config": {
    "auth/validator": {
      "alg": "RS256",
      "jwk_url": "https://login.briggsandwalker.com/realms/briggs/protocol/openid_connect/certs",
      "issuer": "https://login.briggsandwalker.com/realms/briggs"
    }
  }
}
```

## 5. File Structure

```
gateway/
├── krakend.json            # Main configuration
├── partials/              # Configuration partials
│   ├── endpoints/         # Endpoint definitions
│   ├── backends/          # Backend configurations
│   └── middleware/        # Middleware configs
├── templates/             # Go templates
├── docker-compose.yml     # Container orchestration
└── Dockerfile            # Container definition
```

## 6. Health Check Endpoints

### Built-in Endpoints
```bash
# Health check
GET /__health

# Statistics
GET /__stats

# Debug information (dev only)
GET /__debug

# Echo test
GET /__echo
```

### Custom Health Check
```json
{
  "endpoint": "/health",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/__health",
      "host": ["http://localhost:8080"],
      "method": "GET"
    }
  ]
}
```
