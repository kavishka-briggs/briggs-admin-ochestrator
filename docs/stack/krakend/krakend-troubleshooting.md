# KrakenD Stack - Troubleshooting

**PROBLEM-SOLVING FOCUS**: KrakenD Gateway-specific solutions and debugging.

## Configuration Issues

### Problem: KrakenD fails to start with configuration errors
**Symptoms:**
- "Invalid configuration" errors on startup
- KrakenD exits immediately
- JSON syntax or schema validation errors

**Solutions:**
```bash
# 1. Validate configuration file
krakend check -c krakend.json

# 2. Check JSON syntax
cat krakend.json | jq '.'

# 3. Test with minimal configuration
{
  "version": 3,
  "port": 8080,
  "endpoints": [
    {
      "endpoint": "/test",
      "method": "GET",
      "backend": [
        {
          "url_pattern": "/",
          "host": ["http://httpbin.org"]
        }
      ]
    }
  ]
}

# 4. Enable debug logging
krakend run -c krakend.json -d

# 5. Check for common JSON issues
# - Missing commas
# - Trailing commas
# - Incorrect quotes
# - Missing brackets/braces
```

### Problem: Environment variables not substituting in config
**Symptoms:**
- Configuration contains literal `{{ .VAR_NAME }}` instead of values
- Service URLs not resolving correctly
- Authentication configuration not working

**Solutions:**
```bash
# 1. Check environment variables are set
env | grep KRAKEND
env | grep API_URL

# 2. Generate config with variables
krakend run -c krakend.json

# 3. Test variable substitution
# Create simple test:
{
  "version": 3,
  "port": 8080,
  "name": "{{ .SERVICE_NAME }}",
  "endpoints": []
}

export SERVICE_NAME="test-gateway"
krakend run -c test.json

# 4. Check template syntax
# Correct: {{ .VAR_NAME }}
# Wrong: ${VAR_NAME}, $VAR_NAME, {VAR_NAME}
```

## Routing Issues

### Problem: 404 errors for configured endpoints
**Symptoms:**
- Endpoints return 404 but are defined in config
- Routes work sometimes but not others
- Exact URLs work but parameterized don't

**Solutions:**
```bash
# 1. Check endpoint exact path matching
# KrakenD is strict about paths:
"endpoint": "/api/v1/projects"      # Matches: /api/v1/projects
"endpoint": "/api/v1/projects/"     # Matches: /api/v1/projects/
# These are different endpoints!

# 2. Verify parameter syntax
"endpoint": "/api/v1/projects/{id}"          # Correct
"endpoint": "/api/v1/projects/:id"           # Wrong
"endpoint": "/api/v1/projects/<id>"          # Wrong

# 3. Test with curl
curl -v http://localhost:8080/api/v1/projects
curl -v http://localhost:8080/api/v1/projects/123

# 4. Check method matching
{
  "endpoint": "/api/v1/projects",
  "method": "GET"                    # Only matches GET requests
}

# 5. Enable debug logging to see route matching
krakend run -c krakend.json -d
```

### Problem: Backend services not reachable
**Symptoms:**
- "Connection refused" errors
- "No route to host" errors
- Timeouts connecting to backend services

**Solutions:**
```bash
# 1. Test backend connectivity from gateway container
docker exec -it krakend-container /bin/sh
wget -O- http://projects-api:8080/health

# 2. Check Docker network configuration
docker network ls
docker network inspect bridge_network_name

# 3. Verify service names in docker-compose
# krakend.json:
"host": ["http://projects-api:8080"]
# docker-compose.yml:
services:
  projects-api:              # Must match host name
    image: projects-api

# 4. Test with container IP instead of name
docker inspect projects-api | grep IPAddress
# Use IP temporarily: "host": ["http://172.18.0.3:8080"]

# 5. Check port mapping
# Container port in krakend.json must match EXPOSE port
# Not the host mapped port
```

## Authentication Issues

### Problem: JWT validation fails
**Symptoms:**
- 401 Unauthorized responses
- "Invalid token" errors
- Tokens work directly with backend but not through gateway

**Solutions:**
```bash
# 1. Check JWT configuration
{
  "auth/validator": {
    "alg": "RS256",                                    # Must match Keycloak
    "jwk_url": "https://keycloak.com/realms/briggs/protocol/openid_connect/certs",
    "issuer": "https://keycloak.com/realms/briggs"     # Must match token iss claim
  }
}

# 2. Test JWK URL accessibility
curl https://keycloak.com/realms/briggs/protocol/openid_connect/certs

# 3. Decode token and verify claims
# Use jwt.io to decode token and check:
# - iss (issuer) matches configuration
# - aud (audience) if required
# - exp (expiration) not exceeded

# 4. Test token manually
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/projects

# 5. Enable auth debug logging
"extra_config": {
  "telemetry/logging": {
    "level": "DEBUG"
  }
}
```

### Problem: CORS preflight requests failing
**Symptoms:**
- OPTIONS requests returning 404 or 405
- "Access to fetch blocked by CORS policy"
- Frontend can't make authenticated requests

**Solutions:**
```bash
# 1. Add CORS configuration at service level
{
  "extra_config": {
    "security/cors": {
      "allow_origins": ["http://localhost:3000", "http://localhost:5173"],
      "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allow_headers": ["Authorization", "Content-Type"],
      "allow_credentials": true
    }
  }
}

# 2. Test OPTIONS request
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  http://localhost:8080/api/v1/projects

# 3. Check specific endpoint configuration
# Each endpoint needs to handle OPTIONS if custom configured
{
  "endpoint": "/api/v1/projects",
  "method": "OPTIONS",
  "output_encoding": "no-op",
  "backend": [
    {
      "url_pattern": "/",
      "host": ["http://localhost:8080"],
      "method": "GET"
    }
  ]
}
```

## Performance Issues

### Problem: Slow response times through gateway
**Symptoms:**
- Requests take much longer through gateway than direct to backend
- Timeouts occurring
- High latency

**Solutions:**
```bash
# 1. Check timeout configurations
{
  "timeout": "30s",                    # Global timeout
  "cache_ttl": "300s",                # Cache TTL
  "backend": [
    {
      "timeout": "10s",               # Backend-specific timeout
      "host": ["http://api:8080"]
    }
  ]
}

# 2. Optimize backend requests
{
  "backend": [
    {
      "disable_host_sanitize": true,   # Skip hostname validation
      "extra_config": {
        "backend/http": {
          "return_error_details": "backend_alias"  # Reduce error detail processing
        }
      }
    }
  ]
}

# 3. Enable caching for static data
{
  "endpoint": "/api/v1/lookup/countries",
  "cache_ttl": "24h",                 # Cache for 24 hours
  "backend": [...]
}

# 4. Check for unnecessary sequential processing
{
  "extra_config": {
    "proxy": {
      "sequential": false             # Enable parallel backend calls
    }
  }
}

# 5. Monitor backend performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/v1/projects

# curl-format.txt:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

### Problem: High memory usage or memory leaks
**Symptoms:**
- Gateway memory usage constantly increasing
- Out of memory errors
- Container restarts due to memory limits

**Solutions:**
```bash
# 1. Optimize caching configuration
{
  "cache_ttl": "5m",                  # Shorter cache times
  "extra_config": {
    "qos/ratelimit/service": {
      "max_rate": 100,                # Limit request rate
      "capacity": 200
    }
  }
}

# 2. Check for large response caching
# Avoid caching large responses
{
  "backend": [
    {
      "extra_config": {
        "modifier/martian": {
          "header.Modifier": {
            "scope": ["response"],
            "name": "Cache-Control",
            "value": "no-cache"         # Disable caching for large responses
          }
        }
      }
    }
  ]
}

# 3. Monitor memory usage
docker stats krakend-container

# 4. Set memory limits
# docker-compose.yml:
services:
  gateway:
    mem_limit: 512m
    memswap_limit: 512m
```

## Docker and Deployment Issues

### Problem: KrakenD container fails to start
**Symptoms:**
- Container exits immediately
- "No such file or directory" errors
- Permission denied errors

**Solutions:**
```dockerfile
# 1. Check Dockerfile configuration
FROM devopsfaith/krakend:2.4
COPY krakend.json /etc/krakend/krakend.json
EXPOSE 8080
CMD ["run", "-c", "/etc/krakend/krakend.json"]

# 2. Verify file permissions
ls -la krakend.json
chmod 644 krakend.json

# 3. Test configuration before building
krakend check -c krakend.json

# 4. Use absolute paths
COPY krakend.json /etc/krakend/krakend.json
# Not: COPY krakend.json krakend.json

# 5. Check base image version compatibility
# Some configurations require specific KrakenD versions
```

### Problem: Configuration not updating in container
**Symptoms:**
- Changes to krakend.json not reflected
- Old routes still working after removal
- New endpoints returning 404

**Solutions:**
```bash
# 1. Rebuild container after config changes
docker-compose down
docker-compose build gateway
docker-compose up gateway

# 2. Check volume mounting
# docker-compose.yml:
services:
  gateway:
    volumes:
      - ./krakend.json:/etc/krakend/krakend.json:ro

# 3. Verify file is updated in container
docker exec -it gateway-container cat /etc/krakend/krakend.json

# 4. Force container recreation
docker-compose up --force-recreate gateway
```

## Debugging and Monitoring

### Problem: Unable to debug gateway issues
**Symptoms:**
- No visibility into request flow
- Error messages not helpful
- Can't trace request path

**Solutions:**
```bash
# 1. Enable debug logging
krakend run -c krakend.json -d

# 2. Add request/response logging
{
  "extra_config": {
    "telemetry/logging": {
      "level": "DEBUG",
      "prefix": "[GATEWAY]",
      "stdout": true,
      "format": "json"
    }
  }
}

# 3. Use built-in debug endpoints
curl http://localhost:8080/__debug

# 4. Monitor with stats endpoint
curl http://localhost:8080/__stats

# 5. Add custom headers for tracing
{
  "extra_config": {
    "modifier/martian": {
      "header.Modifier": {
        "scope": ["request"],
        "name": "X-Request-ID",
        "value": "{{ .request_id }}"
      }
    }
  }
}

# 6. Test individual backend connectivity
curl -v http://backend-service:8080/health
```
