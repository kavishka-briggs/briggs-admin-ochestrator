# KrakenD Dynamic Plugin Discovery

<!-- Keywords for AI discovery: dynamic plugin, runtime configuration, briggsbase, plugin discovery, route generation, external API -->

## Overview

KrakenD Gateway implements **dynamic plugin discovery** that fetches plugin configurations at runtime from BriggsBase API, enabling zero-downtime plugin activation and route management.

## Architecture Flow

```
Container Start → Entrypoint Script → BriggsBase API → Plugin Routes → KrakenD Start
```

### Runtime Configuration Loading

**Entrypoint Process** (`entrypoint.sh`):
```bash
#!/bin/sh
set -e
echo "Getting plugin settings from $PLUGIN_SETTINGS_URL"
rm -f settings/*
cp /settings/* settings
wget $PLUGIN_SETTINGS_URL -O settings/plugins.json
echo "Starting KrakenD"
krakend run -c krakend.json -d
```

**Key Components:**
1. **Clean Settings**: Removes existing plugin configurations
2. **Copy Defaults**: Restores base settings from container
3. **Fetch Active Plugins**: Downloads current plugin configuration from BriggsBase
4. **Start Gateway**: Launches KrakenD with updated configuration

## Plugin Configuration Schema

### BriggsBase API Response
```json
{
  "plugins": [
    {
      "id": "module-quartercompletion",
      "name": "Quarter Completion",
      "backend_url": "backend-module-quartercompletion-service.backend-module-quartercompletion.svc.cluster.local",
      "backend_port": "8080",
      "gateway_path": "/api/quarter_completion",
      "plugin_routes": [
        {
          "path": "/projects",
          "method": "GET",
          "authorization": "ProjectsDomains",
          "route_Type": "Authenticated"
        },
        {
          "path": "/health",
          "method": "GET",
          "authorization": null,
          "route_Type": "NoAuth"
        }
      ]
    }
  ]
}
```

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plugin identifier (used for auth context) |
| `name` | string | Human-readable plugin name |
| `backend_url` | string | Kubernetes service DNS name |
| `backend_port` | string | Service port number |
| `gateway_path` | string | Gateway route prefix |
| `plugin_routes` | array | Individual route definitions |

### Route Configuration

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Route path pattern (supports parameters) |
| `method` | string | HTTP method (GET, POST, PUT, DELETE) |
| `authorization` | string | Authorization type (`ProjectsDomains`, `DomainOnly`, null) |
| `route_Type` | string | Authentication requirement (`Authenticated`, `NoAuth`) |

## Template Generation

### Dynamic Route Template (`templates/plugins.tmpl`)
```go
{{ range $index, $plugin := $plugins }}
{{ range $index_route, $plugin_route := $plugin.plugin_routes }}
{
    "endpoint": "{{ $plugin.gateway_path }}{{ $plugin_route.path }}",
    "method": "{{ $plugin_route.method }}",
    "input_headers": ["Authorization", "Content-Type", "x-sub"],
    "backend": [{
        "url_pattern": "{{ $plugin_route.path }}",
        "host": ["{{ $plugin.backend_url }}:{{ $plugin.backend_port }}"]
    }],
    "extra_config": {
        {{ if not (eq $plugin_route.route_Type "NoAuth") }}
        {{ template "AuthValidatorPlugin" }},
        "plugin/req-resp-modifier": {
            "name": ["auth-plugin"],
            "auth-plugin": {
                "plugin-id": "{{ $plugin.id }}",
                "authorization": "{{ $plugin_route.authorization }}",
                "auth-required": true
            }
        }
        {{ else }}
        {{ template "NoAuthRatelimiter" }}
        {{ end }}
    }
}
{{ end }}
{{ end }}
```

## Environment Configuration

### Required Environment Variables
```bash
# Plugin Discovery
PLUGIN_SETTINGS_URL="http://backend-briggsbase-service.backend-briggsbase.svc.cluster.local:8080/api/plugins"

# Development vs Production
DEVELOPMENT="true|false"
```

### Kubernetes Configuration
```yaml
# Helm template values
env:
- name: PLUGIN_SETTINGS_URL
  value: "http://backend-briggsbase-service.backend-briggsbase.svc.cluster.local:8080/api/plugins"
- name: DEVELOPMENT
  value: "{{ .Values.development }}"
```

## Plugin Activation Workflow

### 1. Plugin Registration (BriggsBase)
```sql
-- Plugin registered in briggsbase database
INSERT INTO plugins (id, name, backend_url, backend_port, gateway_path, active)
VALUES ('new-plugin', 'New Plugin', 'service-url', '8080', '/api/new', 1);
```

### 2. Route Configuration
```sql
-- Routes defined for plugin
INSERT INTO plugin_routes (plugin_id, path, method, authorization, route_type)
VALUES ('new-plugin', '/endpoint', 'GET', 'ProjectsDomains', 'Authenticated');
```

### 3. Domain Activation
```sql
-- Plugin activated for specific domains
INSERT INTO domain_plugins (domain_id, plugin_id, active)
VALUES (1, 'new-plugin', 1);
```

### 4. Runtime Discovery
- Container restart triggers plugin discovery
- BriggsBase API returns updated plugin list
- KrakenD loads new routes automatically

## Authorization Integration

### Plugin-Specific Authorization
```go
// Auth plugin processes domain-specific access
type ActiveProjectsTokenItem struct {
    ProjectCode string   `json:"p"`
    DomainCode  string   `json:"d"`
    Roles       []string `json:"r"`
}

// Generated for each plugin request
func getActiveDomainsForPlugin(briggsBaseHost string, pluginId string, token string) (*ActiveDomainsRequest, error) {
    url := fmt.Sprintf("%s/api/plugins/%s/active-domains", briggsBaseHost, pluginId)
    // Returns domains user can access for this specific plugin
}
```

### Authorization Types

| Type | Description | Use Case |
|------|-------------|----------|
| `ProjectsDomains` | Full project and domain access | Main business operations |
| `DomainOnly` | Domain-level access only | Configuration operations |
| `ProjectOnly` | Project-specific access | Reporting operations |
| `null` | No authorization required | Health checks, public endpoints |

## Troubleshooting

### Plugin Discovery Issues

**Problem**: Plugin not appearing in routes
```bash
# Check plugin configuration fetch
curl -H "Authorization: Bearer $TOKEN" \
  http://backend-briggsbase-service.backend-briggsbase.svc.cluster.local:8080/api/plugins

# Verify plugin is active in database
# Check domain_plugins table for user's domain
```

**Problem**: Route authentication failing
```bash
# Check auth plugin configuration
curl -H "Authorization: Bearer $TOKEN" \
  http://gateway/api/plugin-path/endpoint

# Verify plugin_routes.authorization setting
# Check if user has domain access for plugin
```

### Configuration Validation

**Problem**: Invalid plugin configuration
```bash
# Test configuration validation
docker run --rm -v $(pwd):/etc/krakend krakend:2.9.4 check --config krakend.json

# Check template rendering
kubectl logs deployment/krakend -c krakend | grep "Getting plugin settings"
```

### Service Discovery Issues

**Problem**: Backend service not reachable
```bash
# Test Kubernetes service DNS
kubectl run debug --image=alpine/curl -it --rm -- \
  curl http://backend-module-service.namespace.svc.cluster.local:8080/health

# Check service and endpoints
kubectl get svc,endpoints -n namespace
```

## Best Practices

### Plugin Development
1. **Health Endpoints**: Always include `/health` with `NoAuth`
2. **Authorization Mapping**: Choose appropriate authorization type per route
3. **Path Parameters**: Use KrakenD-compatible path patterns
4. **Error Handling**: Implement proper HTTP status codes

### Operational Excellence
1. **Plugin Activation**: Test in development environment first
2. **Domain Rollout**: Activate plugins per domain incrementally
3. **Monitoring**: Track plugin usage and performance metrics
4. **Rollback**: Keep previous plugin configurations for quick rollback

### Security Considerations
1. **Authorization Required**: Use `Authenticated` route type by default
2. **Minimal Public Endpoints**: Limit `NoAuth` routes to essentials
3. **Domain Isolation**: Verify plugin respects domain boundaries
4. **Token Validation**: Ensure backend services accept gateway headers

## Integration Patterns

### Plugin Registration API
```csharp
// BriggsBase API endpoint for plugin management
[HttpPost("/api/plugins")]
public async Task<IActionResult> RegisterPlugin([FromBody] PluginRegistration plugin)
{
    // Validate plugin configuration
    // Insert into plugins table
    // Update active domains
    // Trigger gateway reload
}
```

### Domain-Specific Activation
```typescript
// Frontend plugin activation
const activatePluginForDomain = async (pluginId: string, domainId: number) => {
  await apiClient.post(`/api/domains/${domainId}/plugins/${pluginId}/activate`);
  // Triggers gateway configuration refresh
};
```

---

**Related Documentation:**
- [`krakend-auth-plugin-development.md`](krakend-auth-plugin-development.md) - Auth plugin patterns
- [`../../databases/briggsbase-database-schema.md`](../../databases/briggsbase-database-schema.md) - Plugin storage schema
- [`krakend-template-system.md`](krakend-template-system.md) - Template development
