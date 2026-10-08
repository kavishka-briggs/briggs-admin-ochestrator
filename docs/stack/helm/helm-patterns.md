# Helm Deployment Patterns

## Standard Deployment Patterns

### Pattern 1: Microservice Backend Deployment

**Use Case**: .NET API microservices
**Chart**: `helm/backend`

```yaml
# values-production.yaml
name: "user-service"
deployment:
  name: "user-service"
  replicas: 3
  containerPort: "8080"
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
service:
  name: "user-service"
  type: ClusterIP
  port: 8080
image: "registry.briggs.com/user-service"
imageTag: "v1.2.3"
secrets:
  DATABASE_CONNECTION_STRING: ""
  KEYCLOAK_SECRET: ""
  API_KEY: ""
```

**Deployment Command**:
```bash
helm upgrade --install user-service helm/backend \
  -f values-production.yaml \
  --set imageTag=v1.2.3
```

### Pattern 2: React Microfrontend Deployment

**Use Case**: React module federation microfrontends
**Chart**: `helm/frontend`

```yaml
# values-microfrontend.yaml
name: "module-users"
deployment:
  name: "module-users"
  replicas: 2
  containerPort: "3000"
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 50m
      memory: 64Mi
service:
  name: "module-users"
  type: ClusterIP
  port: 3000
ingress:
  enabled: true
  host: "users.briggs.com"
  path: "/module-users"
image: "registry.briggs.com/module-users"
imageTag: "v2.1.0"
secrets:
  API_BASE_URL: ""
  KEYCLOAK_CONFIG: ""
```

**Deployment Command**:
```bash
helm upgrade --install module-users helm/frontend \
  -f values-microfrontend.yaml \
  --set imageTag=v2.1.0
```

## Environment-Specific Patterns

### Development Environment Pattern

**Characteristics**:
- Single replica
- Relaxed resource limits
- Debug-friendly configuration
- Development domains

```yaml
# values-dev-template.yaml
name: "${SERVICE_NAME}"
deployment:
  name: "${SERVICE_NAME}"
  replicas: 1
  containerPort: "${CONTAINER_PORT}"
  podAnnotations:
    timestamp: "${BUILD_TIMESTAMP}"
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 100m
      memory: 128Mi
service:
  name: "${SERVICE_NAME}"
  type: ClusterIP
  port: ${SERVICE_PORT}
namespace: "development"
imageTag: "development"
image: "${CONTAINER_REGISTRY}/${SERVICE_NAME}"
```

### Production Environment Pattern

**Characteristics**:
- Multiple replicas for HA
- Strict resource limits
- Production security
- Production domains

```yaml
# values-prod-template.yaml
name: "${SERVICE_NAME}"
deployment:
  name: "${SERVICE_NAME}"
  replicas: 3
  containerPort: "${CONTAINER_PORT}"
  podAnnotations:
    timestamp: "${BUILD_TIMESTAMP}"
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
service:
  name: "${SERVICE_NAME}"
  type: ClusterIP
  port: ${SERVICE_PORT}
namespace: "production"
imageTag: "${VERSION_TAG}"
image: "${CONTAINER_REGISTRY}/${SERVICE_NAME}"
```

## Multi-Environment Management Patterns

### Pattern 1: Single Chart, Multiple Values Files

**Structure**:
```
service-repo/
├── deployment/
│   ├── values-dev.yaml
│   ├── values-staging.yaml
│   └── values-prod.yaml
└── scripts/
    └── deploy.sh
```

**Deployment Script**:
```bash
#!/bin/bash
ENVIRONMENT=$1
SERVICE_NAME=$2
IMAGE_TAG=$3

helm upgrade --install ${SERVICE_NAME} \
  path/to/plugin-deploy/helm/backend \
  -f deployment/values-${ENVIRONMENT}.yaml \
  --set imageTag=${IMAGE_TAG} \
  --set deployment.name=${SERVICE_NAME} \
  --set name=${SERVICE_NAME}
```

### Pattern 2: Environment-Specific Namespaces

**Development Namespace**:
```yaml
# values-dev.yaml
namespace: "briggs-dev"
ingress:
  host: "service.dev.briggs.com"
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
```

**Production Namespace**:
```yaml
# values-prod.yaml
namespace: "briggs-prod"
ingress:
  host: "service.briggs.com"
resources:
  limits:
    cpu: 500m
    memory: 512Mi
```

## Secret Management Patterns

### Pattern 1: Environment-Specific Secrets

**Development Secrets**:
```bash
kubectl create secret generic backend-user-service-secrets \
  --namespace=briggs-dev \
  --from-literal=DATABASE_CONNECTION_STRING="Server=dev-db;Database=Users;..." \
  --from-literal=KEYCLOAK_SECRET="dev-secret" \
  --from-literal=API_KEY="dev-api-key"
```

**Production Secrets**:
```bash
kubectl create secret generic backend-user-service-secrets \
  --namespace=briggs-prod \
  --from-literal=DATABASE_CONNECTION_STRING="Server=prod-db;Database=Users;..." \
  --from-literal=KEYCLOAK_SECRET="prod-secret" \
  --from-literal=API_KEY="prod-api-key"
```

### Pattern 2: Secret Template Usage

**In Deployment Template**:
```yaml
spec:
  template:
    spec:
      containers:
      - name: {{ .Values.name }}
        env:
        {{- include "backend.splitSecrets" (dict "secretName" .Values.name "secrets" .Values.secrets) | nindent 8 }}
        - name: ENVIRONMENT
          value: {{ .Values.environment | default "development" }}
```

**In Values File**:
```yaml
secrets:
  DATABASE_CONNECTION_STRING: ""
  KEYCLOAK_SECRET: ""
  API_KEY: ""
  SMTP_PASSWORD: ""
environment: "production"
```

## CI/CD Integration Patterns

### Pattern 1: GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Helm
      uses: azure/setup-helm@v1
      with:
        version: '3.10.0'
    
    - name: Deploy to Development
      if: github.ref == 'refs/heads/develop'
      run: |
        helm upgrade --install ${{ github.event.repository.name }} \
          ./plugin-deploy/helm/backend \
          -f ./deployment/values-dev.yaml \
          --set imageTag=development-${{ github.sha }}
    
    - name: Deploy to Production
      if: github.ref == 'refs/heads/main'
      run: |
        helm upgrade --install ${{ github.event.repository.name }} \
          ./plugin-deploy/helm/backend \
          -f ./deployment/values-prod.yaml \
          --set imageTag=v${{ github.run_number }}
```

### Pattern 2: Azure DevOps Integration

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
    - main
    - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  serviceName: '$(Build.Repository.Name)'
  
stages:
- stage: Deploy
  jobs:
  - job: DeployToK8s
    steps:
    - task: HelmInstaller@1
      inputs:
        helmVersionToInstall: '3.10.0'
    
    - task: HelmDeploy@0
      inputs:
        command: upgrade
        chartType: FilePath
        chartPath: './plugin-deploy/helm/backend'
        releaseName: '$(serviceName)'
        valueFile: './deployment/values-$(Build.SourceBranchName).yaml'
        overrideValues: 'imageTag=$(Build.BuildNumber)'
```

## Monitoring Integration Patterns

### Pattern 1: Prometheus Metrics

**Deployment Annotations**:
```yaml
# In deployment template
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "{{ .Values.deployment.containerPort }}"
    prometheus.io/path: "/metrics"
```

**Values Configuration**:
```yaml
monitoring:
  prometheus:
    enabled: true
    port: 8080
    path: "/metrics"
  healthCheck:
    enabled: true
    path: "/health"
    initialDelaySeconds: 30
    periodSeconds: 10
```

### Pattern 2: Logging Integration

**Pod Labels for Log Aggregation**:
```yaml
# In deployment template
metadata:
  labels:
    app: {{ .Values.name }}
    version: {{ .Values.imageTag }}
    component: {{ .Values.component | default "backend" }}
    stack: "briggs-system"
```

**Logging Configuration**:
```yaml
logging:
  level: "INFO"
  format: "json"
  aggregation:
    enabled: true
    labels:
      service: {{ .Values.name }}
      environment: {{ .Values.environment }}
```

## Scaling Patterns

### Pattern 1: Horizontal Pod Autoscaler (HPA)

```yaml
# hpa.yaml template
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .Values.name }}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Values.deployment.name }}
  minReplicas: {{ .Values.autoscaling.minReplicas | default 2 }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas | default 10 }}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: {{ .Values.autoscaling.cpuThreshold | default 70 }}
```

**Values Configuration**:
```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  cpuThreshold: 70
  memoryThreshold: 80
```

### Pattern 2: Vertical Pod Autoscaler (VPA)

```yaml
# vpa.yaml template
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: {{ .Values.name }}-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Values.deployment.name }}
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: {{ .Values.name }}
      maxAllowed:
        cpu: 1
        memory: 2Gi
      minAllowed:
        cpu: 100m
        memory: 128Mi
```

## Service Mesh Integration Patterns

### Pattern 1: Istio Integration

**Service Mesh Labels**:
```yaml
# In deployment template
metadata:
  labels:
    app: {{ .Values.name }}
    version: {{ .Values.imageTag }}
  annotations:
    sidecar.istio.io/inject: "true"
```

**Virtual Service Configuration**:
```yaml
# virtualservice.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: {{ .Values.name }}
spec:
  hosts:
  - {{ .Values.name }}
  http:
  - route:
    - destination:
        host: {{ .Values.name }}
        port:
          number: {{ .Values.service.port }}
```

## Troubleshooting Patterns

### Pattern 1: Debug Mode Deployment

**Debug Values Override**:
```yaml
# values-debug.yaml
deployment:
  replicas: 1
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
  env:
    LOG_LEVEL: "DEBUG"
    DEBUG_MODE: "true"
securityContext:
  runAsNonRoot: false  # Allow debugging tools
```

**Debug Deployment**:
```bash
helm upgrade --install debug-service helm/backend \
  -f values-debug.yaml \
  --set imageTag=debug-latest
```

### Pattern 2: Canary Deployment

**Canary Values**:
```yaml
# values-canary.yaml
name: "service-canary"
deployment:
  name: "service-canary"
  replicas: 1
service:
  name: "service-canary"
imageTag: "canary-v2.0.0"
```

**Traffic Splitting**:
```bash
# Deploy canary version
helm upgrade --install service-canary helm/backend \
  -f values-canary.yaml

# Monitor metrics and gradually shift traffic
# Remove canary after validation
helm uninstall service-canary
```
