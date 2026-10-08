# Helm Deployment Architecture

## Overview

The `plugin-deploy` repository provides shared Helm charts for standardized deployment of Briggs System components across environments. This infrastructure-as-code approach ensures consistent, scalable, and maintainable deployments for both backend microservices and frontend microfrontends.

## Repository Structure

```
plugin-deploy/
├── helm/
│   ├── backend/           # Shared backend API chart (name backend-plugin, version 1.0.0)
│   │   ├── Chart.yaml
│   │   ├── values-dev.yaml
│   │   ├── values-eu.yaml
│   │   ├── values-au.yaml     # Australia; same shape as EU (replicas: 1, resources.enabled: true)
│   │   └── templates/         # deployment, secret, service, _helpers (4 files)
│   ├── frontend/          # Shared frontend chart (name frontend-plugin, version 1.0.0)
│   │   ├── Chart.yaml
│   │   ├── values-dev.yaml
│   │   ├── values-eu.yaml
│   │   ├── values-au.yaml
│   │   └── templates/         # deployment, ingress, secret, service, _helpers (5 files)
│   └── sonarqube/
│       └── values-prod.yaml   # Values overlay only; not a third application chart
├── docker-compose/        # Local compose (nginx, monitoring, infra)
├── grafana/               # Datasource provisioning
├── k8s/monitoring-dev/
└── .github/workflows/     # Reusable build/deploy (dev, eu, au; plus Koppel, Keycloak, KrakenD, DWH, mobile)
```

## Deployment Architecture

### Chart Design Principles

1. **Standardization**: Common deployment patterns across all services
2. **Environment Agnostic**: Single chart, environment-specific values
3. **Security First**: Built-in secret management and security practices
4. **Scalability**: Configurable resource allocation and scaling
5. **Observability**: Integrated monitoring and logging

### Backend Chart Features

The backend Helm chart (`helm/backend/`) provides:

- **Kubernetes Deployment**: Configurable pod specifications (`deployment.replicas`, `containerPort`)
- **Service Management**: ClusterIP services (default port 8080)
- **Secret Handling**: `backend.splitSecrets` injects env from `<name>-secrets`
- **Resource Allocation**: Optional requests when `resources.enabled` and CPU/memory are set (no limits in the template)
- **Probes**: the shared backend `deployment.yaml` does **not** define liveness or readiness probes. Services that need probes ship them in an in-repo chart (for example `clamav-api`)
- **Multi-Environment**: `values-dev.yaml`, `values-eu.yaml`, `values-au.yaml`

### Frontend Chart Features

The frontend Helm chart (`helm/frontend/`) provides:

- **Kubernetes Deployment**: React microfrontend pods (`service.port` default 3000)
- **Ingress Configuration**: `ingress.yaml` (`className` nginx, TLS secret, `orchestratordomain`, `hosts`)
- **Service Management**: ClusterIP
- **Secret Handling**: the frontend chart reuses the helper name `backend.splitSecrets` (same as backend)
- **Probes**: none in the shared frontend `deployment.yaml`
- **Multi-Environment**: `values-dev.yaml`, `values-eu.yaml`, `values-au.yaml`

## Environment Configuration

### Development Environment (`values-dev.yaml`)
- `deployment.replicas: 1`
- `resources.enabled: false` (no CPU/memory requests unless overridden at install)

### EU and AU (`values-eu.yaml`, `values-au.yaml`)
- Still `deployment.replicas: 1` in the chart defaults (not a multi-replica preset)
- `resources.enabled: true`; `requestCpu` / `requestMemory` are empty until the calling workflow sets them
- Image tag default remains `development` until `--set imageTag=`

## Secret Management

### Helper Template: `backend.splitSecrets`

```yaml
{{- define "backend.splitSecrets" -}}
{{- $secretName := .secretName -}}
{{- if .secrets }}
{{- range $key, $_ := .secrets }}
- name: {{ $key }}
  valueFrom:
    secretKeyRef:
      name: {{ $secretName }}-secrets
      key: {{ $key }}
{{- end }}
{{- end }}
{{- end -}}
```

This helper template:
- Dynamically creates environment variables from Kubernetes secrets
- Supports secure credential injection
- Maintains separation between configuration and secrets
- Provides consistent naming conventions

## Integration with Briggs System

### Service Discovery
- Charts integrate with `briggsbase` for service registration
- Gateway routing configuration through KrakenD
- Automatic service mesh integration

### Authentication & Authorization
- Charts inject secrets; they do **not** validate JWTs. Only KrakenD validates tokens (`docs/authentication-architecture-principles.md`)
- ClusterIP backends are not public Ingress unless a service chart adds one

### Monitoring & Observability
- Optional local `docker-compose/monitoring` and `grafana/` provisioning live in this repo
- Shared Helm templates do not install Prometheus ServiceMonitors or HTTP probes

## Deployment Workflow

### 1. Chart Preparation
```bash
# Clone the plugin-deploy repository
git clone <plugin-deploy-repo>
cd plugin-deploy

# Update chart dependencies
helm dependency update helm/backend
helm dependency update helm/frontend
```

### 2. Environment-Specific Deployment
```bash
# Deploy to development environment
helm upgrade --install <service-name> helm/backend \
  -f helm/backend/values-dev.yaml \
  --set deployment.name=<service-name> \
  --set image=<container-image>

# Deploy to EU production environment
helm upgrade --install <service-name> helm/backend \
  -f helm/backend/values-eu.yaml \
  --set deployment.name=<service-name> \
  --set image=<container-image>
```

### 3. Secret Management
```bash
# Create secrets before deployment
kubectl create secret generic backend-<service-name>-secrets \
  --from-literal=DATABASE_CONNECTION_STRING=<value> \
  --from-literal=API_KEY=<value>
```

## Best Practices

### Chart Customization
1. **Override Values**: Use values files for environment-specific configuration
2. **Template Helpers**: Leverage shared helpers for consistency
3. **Resource Limits**: Always define resource limits and requests
4. **Security Context**: Use non-root containers and security contexts

### Deployment Strategy
1. **Rolling Updates**: Use rolling deployment strategy
2. **Health Checks**: Implement proper liveness and readiness probes
3. **Secret Rotation**: Regular secret rotation and management
4. **Monitoring**: Enable monitoring from day one

### Multi-Environment Management
1. **Environment Parity**: Maintain consistency across environments
2. **Configuration Management**: Use values files for environment differences
3. **Testing**: Test in development before production deployment
4. **Rollback Strategy**: Maintain rollback capabilities

## Troubleshooting

### Common Issues
1. **Chart Validation**: Use `helm lint` to validate charts
2. **Template Debugging**: Use `helm template` to debug template rendering
3. **Resource Conflicts**: Check for naming conflicts and resource limits
4. **Secret Access**: Verify secret creation and RBAC permissions

### Debugging Commands
```bash
# Validate chart syntax
helm lint helm/backend

# Debug template rendering
helm template test helm/backend -f helm/backend/values-dev.yaml

# Check deployment status
kubectl get pods -l app=<service-name>
kubectl describe deployment <service-name>
```

## Architecture Integration

This shared deployment infrastructure integrates with:

- **Service Repositories**: Backend microservices and frontend modules
- **Gateway Configuration**: KrakenD routing and load balancing
- **Service Registry**: briggsbase for service discovery
- **Identity Provider**: Keycloak for authentication
- **Monitoring Stack**: Prometheus and logging infrastructure

The standardized deployment approach ensures consistency, reduces complexity, and improves maintainability across the entire Briggs System ecosystem.
