# Helm Deployment Troubleshooting

## Common Issues and Solutions

### Chart Validation Issues

#### Issue: Helm Lint Failures
**Symptoms**: 
- `helm lint` command fails
- Template syntax errors
- Invalid YAML structure

**Diagnosis**:
```bash
# Run helm lint to identify issues
helm lint helm/backend
helm lint helm/frontend

# Check specific template rendering
helm template test helm/backend --debug
```

**Common Causes & Solutions**:

1. **Invalid YAML Indentation**
   ```yaml
   # ❌ Incorrect
   env:
   - name: DATABASE_URL
     value: {{ .Values.database.url }}
   
   # ✅ Correct
   env:
   - name: DATABASE_URL
     value: "{{ .Values.database.url }}"
   ```

2. **Missing Required Values**
   ```bash
   # Add missing values or provide defaults
   helm template test helm/backend \
     --set name=test-service \
     --set image=test-image
   ```

3. **Template Function Errors**
   ```yaml
   # ❌ Incorrect template function usage
   name: {{ .Values.name | upper | quote }}
   
   # ✅ Correct template function usage
   name: {{ .Values.name | upper | quote }}
   ```

#### Issue: Dependency Problems
**Symptoms**:
- Chart dependencies not found
- Version conflicts
- Repository access issues

**Solutions**:
```bash
# Update dependencies
helm dependency update helm/backend

# Check dependency status
helm dependency list helm/backend

# Clear dependency cache
rm -rf helm/backend/charts/
helm dependency build helm/backend
```

### Deployment Issues

#### Issue: Pod Startup Failures
**Symptoms**:
- Pods stuck in `Pending` or `CrashLoopBackOff` state
- Container exit codes > 0
- Resource allocation failures

**Diagnosis**:
```bash
# Check pod status
kubectl get pods -l app=<service-name>

# Describe pod for detailed events
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name> --previous
kubectl logs <pod-name> -c <container-name>
```

**Common Solutions**:

1. **Resource Constraints**
   ```yaml
   # Increase resource limits in values file
   resources:
     limits:
       cpu: 1000m        # Increased from 500m
       memory: 1Gi       # Increased from 512Mi
     requests:
       cpu: 200m         # Increased from 100m
       memory: 256Mi     # Increased from 128Mi
   ```

2. **Image Pull Issues**
   ```bash
   # Check image pull secrets
   kubectl get secrets
   kubectl describe secret <image-pull-secret>
   
   # Verify image exists
   docker pull <image-name>:<tag>
   ```

3. **Environment Variable Issues**
   ```bash
   # Check if secrets exist
   kubectl get secrets | grep <service-name>
   
   # Verify secret contents
   kubectl get secret backend-<service-name>-secrets -o yaml
   
   # Test environment variables in pod
   kubectl exec -it <pod-name> -- env | grep <VAR_NAME>
   ```

#### Issue: Service Discovery Problems
**Symptoms**:
- Services not accessible
- DNS resolution failures
- Network connectivity issues

**Diagnosis**:
```bash
# Check service configuration
kubectl get services
kubectl describe service <service-name>

# Check endpoints
kubectl get endpoints <service-name>

# Test DNS resolution from another pod
kubectl exec -it <test-pod> -- nslookup <service-name>
```

**Solutions**:

1. **Service Port Mismatch**
   ```yaml
   # Ensure service port matches container port
   service:
     port: 8080
   deployment:
     containerPort: "8080"  # Must match
   ```

2. **Label Selector Issues**
   ```yaml
   # Verify service selector matches deployment labels
   # In service template:
   selector:
     app: {{ .Values.name }}
   
   # In deployment template:
   metadata:
     labels:
       app: {{ .Values.name }}
   ```

### Secret Management Issues

#### Issue: Secret Access Denied
**Symptoms**:
- Pods cannot access secrets
- Authentication failures
- Missing environment variables

**Diagnosis**:
```bash
# Check if secret exists
kubectl get secret backend-<service-name>-secrets

# Verify RBAC permissions
kubectl auth can-i get secrets --as=system:serviceaccount:<namespace>:default

# Check secret mounting
kubectl describe pod <pod-name> | grep -A 10 "Mounts:"
```

**Solutions**:

1. **Create Missing Secrets**
   ```bash
   # Create required secrets
   kubectl create secret generic backend-<service-name>-secrets \
     --from-literal=DATABASE_CONNECTION_STRING="<value>" \
     --from-literal=API_KEY="<value>"
   ```

2. **Fix Secret Naming**
   ```yaml
   # Ensure secret name matches template expectation
   # Template expects: backend-<service-name>-secrets
   secretKeyRef:
     name: backend-{{ .Values.name }}-secrets
     key: {{ $key }}
   ```

3. **RBAC Configuration**
   ```yaml
   # Add service account with proper permissions
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: {{ .Values.name }}
   ---
   apiVersion: rbac.authorization.k8s.io/v1
   kind: Role
   metadata:
     name: {{ .Values.name }}-secrets-reader
   rules:
   - apiGroups: [""]
     resources: ["secrets"]
     verbs: ["get", "list"]
   ```

### Ingress and Networking Issues

#### Issue: Ingress Not Working (Frontend Charts)
**Symptoms**:
- External access denied
- 404 errors
- SSL/TLS issues

**Diagnosis**:
```bash
# Check ingress configuration
kubectl get ingress
kubectl describe ingress <ingress-name>

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

**Solutions**:

1. **Ingress Path Configuration**
   ```yaml
   # Ensure correct path configuration
   ingress:
     enabled: true
     host: "service.briggs.com"
     path: "/"
     pathType: "Prefix"
   ```

2. **SSL/TLS Issues**
   ```yaml
   # Add TLS configuration
   ingress:
     tls:
       enabled: true
       secretName: "briggs-tls-secret"
   ```

### Performance Issues

#### Issue: High Resource Usage
**Symptoms**:
- CPU/Memory throttling
- Slow response times
- Pod evictions

**Diagnosis**:
```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Monitor metrics
kubectl get hpa
kubectl describe hpa <hpa-name>
```

**Solutions**:

1. **Adjust Resource Limits**
   ```yaml
   # Optimize resource allocation
   resources:
     limits:
       cpu: 1000m       # Increased
       memory: 2Gi      # Increased
     requests:
       cpu: 500m        # Increased
       memory: 512Mi    # Increased
   ```

2. **Enable Horizontal Pod Autoscaling**
   ```yaml
   # Add HPA configuration
   autoscaling:
     enabled: true
     minReplicas: 2
     maxReplicas: 10
     cpuThreshold: 70
   ```

### Environment-Specific Issues

#### Issue: Environment Value Conflicts
**Symptoms**:
- Wrong configuration in different environments
- Hardcoded values
- Missing environment-specific secrets

**Diagnosis**:
```bash
# Compare values files
diff helm/backend/values-dev.yaml helm/backend/values-eu.yaml

# Check deployed values
helm get values <release-name>
```

**Solutions**:

1. **Environment-Specific Values**
   ```yaml
   # values-dev.yaml
   environment: "development"
   database:
     host: "dev-db.internal"
   
   # values-prod.yaml
   environment: "production"
   database:
     host: "prod-db.internal"
   ```

2. **Conditional Configuration**
   ```yaml
   # Use environment-specific logic in templates
   {{- if eq .Values.environment "development" }}
   replicas: 1
   {{- else }}
   replicas: 3
   {{- end }}
   ```

## Debugging Commands

### Chart Debugging
```bash
# Validate chart syntax
helm lint helm/backend
helm lint helm/frontend

# Debug template rendering
helm template <name> helm/backend \
  -f helm/backend/values-dev.yaml \
  --debug

# Dry run deployment
helm upgrade --install <name> helm/backend \
  -f helm/backend/values-dev.yaml \
  --dry-run --debug
```

### Deployment Debugging
```bash
# Check deployment status
kubectl rollout status deployment/<deployment-name>

# View deployment events
kubectl get events --sort-by=.metadata.creationTimestamp

# Check pod details
kubectl describe pod <pod-name>

# Access pod shell for debugging
kubectl exec -it <pod-name> -- /bin/bash
```

### Network Debugging
```bash
# Test service connectivity
kubectl exec -it <pod-name> -- wget -qO- http://<service-name>:<port>/health

# Check DNS resolution
kubectl exec -it <pod-name> -- nslookup <service-name>.<namespace>.svc.cluster.local

# Port forwarding for local testing
kubectl port-forward service/<service-name> 8080:8080
```

### Secret Debugging
```bash
# List all secrets
kubectl get secrets

# Decode secret values
kubectl get secret <secret-name> -o jsonpath='{.data.DATABASE_CONNECTION_STRING}' | base64 -d

# Check secret usage in pods
kubectl get pods -o yaml | grep -A 10 secretKeyRef
```

## Prevention Best Practices

### Chart Development
1. **Always use `helm lint`** before committing changes
2. **Test template rendering** with different value combinations
3. **Use meaningful default values** in templates
4. **Document required values** in Chart.yaml or README

### Deployment Process
1. **Use dry-run first** for critical deployments
2. **Monitor resource usage** after deployment
3. **Implement health checks** for all services
4. **Use rolling updates** for zero-downtime deployments

### Secret Management
1. **Create secrets before deployment**
2. **Use consistent naming conventions**
3. **Rotate secrets regularly**
4. **Never commit secrets to version control**

### Environment Management
1. **Maintain environment parity** where possible
2. **Use environment-specific value files**
3. **Test in development** before production deployment
4. **Document environment differences**

## Emergency Procedures

### Rollback Deployment
```bash
# Check deployment history
helm history <release-name>

# Rollback to previous version
helm rollback <release-name> <revision-number>

# Quick rollback to last working version
helm rollback <release-name>
```

### Emergency Pod Restart
```bash
# Restart all pods in deployment
kubectl rollout restart deployment/<deployment-name>

# Delete specific pod to force recreation
kubectl delete pod <pod-name>
```

### Resource Emergency
```bash
# Quickly scale down to free resources
kubectl scale deployment <deployment-name> --replicas=0

# Scale back up when resources available
kubectl scale deployment <deployment-name> --replicas=3
```

### Secret Emergency Update
```bash
# Quick secret update
kubectl patch secret backend-<service-name>-secrets \
  -p '{"data":{"DATABASE_CONNECTION_STRING":"<new-base64-value>"}}'

# Restart pods to pick up new secret
kubectl rollout restart deployment/<deployment-name>
```
