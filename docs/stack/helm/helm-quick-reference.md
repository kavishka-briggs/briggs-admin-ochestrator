# Helm Deployment Quick Reference

## Chart Overview

| Chart Type | Purpose | Template Count | Environment Support |
|-----------|---------|---------------|-------------------|
| `backend` (`backend-plugin`) | Microservice APIs | 4 templates (no probes) | `values-dev.yaml`, `values-eu.yaml`, `values-au.yaml` |
| `frontend` (`frontend-plugin`) | React Microfrontends | 5 templates (ingress; no probes) | `values-dev.yaml`, `values-eu.yaml`, `values-au.yaml` |

## Quick Commands

### Deployment Commands
```bash
# Backend service deployment
helm upgrade --install <service-name> helm/backend \
  -f helm/backend/values-dev.yaml \
  --set deployment.name=<service-name> \
  --set image=<container-image> \
  --set imageTag=<tag>

# Frontend module deployment
helm upgrade --install <module-name> helm/frontend \
  -f helm/frontend/values-dev.yaml \
  --set deployment.name=<module-name> \
  --set image=<container-image> \
  --set imageTag=<tag>
```

### Environment-Specific Deployments
```bash
# Development environment
helm upgrade --install <name> helm/backend -f helm/backend/values-dev.yaml

# EU Production environment
helm upgrade --install <name> helm/backend -f helm/backend/values-eu.yaml
```

### Chart Management
```bash
# Validate chart
helm lint helm/backend
helm lint helm/frontend

# Debug templates
helm template <name> helm/backend -f helm/backend/values-dev.yaml

# Check dependencies
helm dependency list helm/backend
```

## Configuration Quick Reference

### Backend Values Structure
```yaml
name: "service-name"
deployment:
  name: "service-name"
  replicas: 1
  containerPort: "8080"
  podAnnotations: 
    timestamp: ""
service:
  name: "service-name"
  type: ClusterIP
  port: 8080
namespace: "default"
imageTag: "development"
image: "your-registry/service-name"
```

### Frontend Values Structure
```yaml
name: "module-name"
deployment:
  name: "module-name"
  replicas: 1
  containerPort: "3000"
  podAnnotations:
    timestamp: ""
service:
  name: "module-name"
  type: ClusterIP
  port: 3000
ingress:
  name: "s"
  tlssecret: ingress-tls
  className: "nginx"
  orchestratordomain: "https://app.briggsdev.tech"
  hosts:
    - ""
namespace: ""
resources:
  enabled: false
  requestCpu: ""
  requestMemory: ""
imageTag: development
image: ""
```

## Secret Management

### Create Secrets
```bash
# Backend secrets
kubectl create secret generic backend-<service-name>-secrets \
  --from-literal=DATABASE_CONNECTION_STRING=<value> \
  --from-literal=API_KEY=<value> \
  --from-literal=KEYCLOAK_SECRET=<value>

# Frontend secrets
kubectl create secret generic <module-name>-secrets \
  --from-literal=API_BASE_URL=<value> \
  --from-literal=KEYCLOAK_CONFIG=<value>
```

### Secret Template Usage
```yaml
# In deployment template
env:
- name: DATABASE_CONNECTION_STRING
  valueFrom:
    secretKeyRef:
      name: backend-<service-name>-secrets
      key: DATABASE_CONNECTION_STRING
```

## Template Helpers

### Backend Secret Helper
```yaml
# Usage in deployment.yaml
env:
{{- include "backend.splitSecrets" (dict "secretName" .Values.name "secrets" .Values.secrets) | nindent 8 }}
```

### Frontend Secret Helper
```yaml
# Usage in deployment.yaml
env:
{{- include "backend.splitSecrets" (dict "secretName" .Values.name "secrets" .Values.secrets) | nindent 8 }}
```

## Environment Differences

### Development (values-dev.yaml)
- **Replicas**: 1
- **Resources**: Minimal (for development)
- **Image Tag**: `development`
- **Security**: Relaxed for debugging
- **Ingress**: Development subdomain

### EU Production (values-eu.yaml)
- **Replicas**: 3+ (high availability)
- **Resources**: Production-grade limits
- **Image Tag**: Specific version tags
- **Security**: Production hardening
- **Ingress**: Production domain

## Common Patterns

### Service Configuration
```yaml
# Standard service setup
service:
  name: {{ .Values.name }}
  type: ClusterIP
  port: {{ .Values.service.port }}
  targetPort: {{ .Values.deployment.containerPort }}
```

### Deployment Configuration
```yaml
# Standard deployment setup
deployment:
  name: {{ .Values.deployment.name }}
  replicas: {{ .Values.deployment.replicas }}
  image: {{ .Values.image }}:{{ .Values.imageTag }}
  containerPort: {{ .Values.deployment.containerPort }}
```

### Ingress Configuration (Frontend Only)
```yaml
# Standard ingress setup
ingress:
  enabled: {{ .Values.ingress.enabled }}
  host: {{ .Values.ingress.host }}
  path: /
  backend:
    service:
      name: {{ .Values.name }}
      port: {{ .Values.service.port }}
```

## Troubleshooting Quick Fixes

### Chart Issues
```bash
# Syntax validation
helm lint helm/backend

# Template rendering check
helm template test helm/backend --debug

# Dependency issues
helm dependency update helm/backend
```

### Deployment Issues
```bash
# Check pod status
kubectl get pods -l app={{ .Values.name }}

# View pod logs
kubectl logs -l app={{ .Values.name }}

# Describe deployment
kubectl describe deployment {{ .Values.deployment.name }}

# Check service endpoints
kubectl get endpoints {{ .Values.name }}
```

### Secret Issues
```bash
# List secrets
kubectl get secrets | grep {{ .Values.name }}

# View secret contents (base64 encoded)
kubectl get secret backend-{{ .Values.name }}-secrets -o yaml

# Test secret access from pod
kubectl exec -it <pod-name> -- env | grep <SECRET_KEY>
```

## Integration Points

### With Briggsbase
- Service registration through deployment labels
- Dynamic routing configuration
- Plugin activation control

### With KrakenD Gateway
- Service discovery through Kubernetes services
- Load balancing configuration
- Route template generation

### With Keycloak
- Authentication configuration through secrets
- Service-to-service authentication
- RBAC integration

### With Monitoring
- Prometheus scraping annotations
- Health check endpoints
- Log aggregation labels

## Version Management

### Chart Versioning
```yaml
# Chart.yaml
version: 1.0.0  # Chart version
appVersion: "1.0"  # Application version
```

### Image Tagging Strategy
- **Development**: `development` tag
- **Staging**: `staging-<commit-sha>`
- **Production**: `v<semver>` (e.g., `v1.2.3`)

## Security Best Practices

### Pod Security
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
```

### Resource Limits
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### Network Policies
```yaml
# Restrict network access
networkPolicy:
  enabled: true
  ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            name: gateway
```
