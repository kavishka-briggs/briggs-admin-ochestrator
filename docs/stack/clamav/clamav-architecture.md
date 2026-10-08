# ClamAV Architecture Principles and Best Practices

**Quick Navigation:**
- **Basic Config & Commands**: See `clamav-quick-reference.md`
- **Code Patterns**: See `clamav-patterns.md` for reusable examples
- **Troubleshooting**: See `clamav-troubleshooting.md` for ClamAV-specific issues

This document outlines the architecture principles and best practices for the ClamAV antivirus scanning service. These guidelines ensure security, performance, and reliability for file scanning operations within the Briggs System.

## Service Architecture Overview

### Purpose and Responsibility
The ClamAV service provides virus scanning capabilities as a microservice within the Briggs System ecosystem. It acts as a security gateway for file uploads and document processing.

### Current `clamav-api` facts (verified 2026-09-22, SHA `a9b9c02`)
- **Runtime**: .NET 10 (`net10.0`, image `mcr.microsoft.com/dotnet/sdk:10.0`); ClamAV base `clamav/clamav-debian:1.4`
- **Scan API**: `POST /scan?fileName=` — basename only (no path separators); default mount `/files`
- **Health**: `GET /health/live` and `GET /health/ready` (not `/health`)
- **Auth**: no `AddJwtBearer` / `UseAuthentication`. Internal ClusterIP. Do **not** add service-side JWT validation
- **Tenancy / ISO fields**: none — filename scanner, not a tenant data path
- **Helm**: in-repo chart `helm/` (not `plugin-deploy`); service port 80 → 8080; probes use the split health paths
- **Hardening that remains required** (current Helm/compose violate these; fix the service, do not rewrite this contract):
  - mount the scan share **read-only**
  - run the API as non-root (`clamav` / `setpriv`)


### Core Components
```
ClamAV Service Architecture:
┌─────────────────────────────────────────────┐
│               API Layer                     │
│  ┌─────────────────────────────────────────┐ │
│  │           Controller.cs                  │ │
│  │  - POST /scan endpoint                   │ │
│  │  - File validation & response handling   │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│            .NET API Host                    │
│  ┌─────────────────────────────────────────┐ │
│  │           Program.cs                     │ │
│  │  - Service registration                  │ │
│  │  - Middleware configuration             │ │
│  │  - OpenAPI documentation                │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│            ClamAV Engine                    │
│  ┌─────────────────────────────────────────┐ │
│  │         clamdscan process                │ │
│  │  - File scanning execution              │ │
│  │  - Virus detection engine               │ │
│  │  - Result code interpretation           │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│           File System Layer                 │
│  ┌─────────────────────────────────────────┐ │
│  │        /files mount point                │ │
│  │  - Read-only file access                │ │
│  │  - Temporary file processing            │ │
│  │  - Virus database storage               │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Container Architecture Pattern

### Multi-Stage Build Strategy
```dockerfile
# Build stage - .NET SDK for application compilation
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /App
COPY . ./
RUN dotnet restore
RUN dotnet publish -r linux-x64 --self-contained true -c Release -o out

# Runtime stage - ClamAV base image with antivirus engine
FROM clamav/clamav-debian:1.4
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
COPY ./docker-entrypoint.sh /init
RUN chmod +x /init
RUN mkdir -p /app /run/clamav /tmp/files && \
    chown -R clamav:clamav /run/clamav /tmp/files /var/lib/clamav
COPY --from=build /App/out /app
RUN chmod +x /app/clamav-api
RUN mkdir /files && \
    chown clamav:clamav /files
EXPOSE 8080
# Entrypoint: setpriv --reuid=clamav --regid=clamav /app/clamav-api --urls=http://[::]:8080
```

### Key Architectural Decisions

1. **Base Image Selection**: Uses `clamav/clamav-debian:1.4` for proven virus scanning capabilities
2. **Self-Contained Deployment**: .NET 10 application is self-contained to reduce runtime dependencies
3. **Security-First Design**: API process must run as non-root (`setpriv` to `clamav`) with a **read-only** scan share
4. **Separation of Concerns**: API layer separated from scanning engine

## Security Architecture

### File Access Control
```bash
# Read-only file mounting
/host/files:/files:ro

# Restricted permissions
chown -R clamav:clamav /run/clamav /tmp/files /var/lib/clamav
```

### Process Isolation
- ClamAV daemon runs as dedicated `clamav` user
- API process handles external communication only
- No direct file system write access from API


### Authentication (internal scanner)

ONLY KrakenD validates JWTs. `clamav-api` must not call `AddAuthentication` / `AddJwtBearer`. The in-cluster Service is ClusterIP (no Ingress template). `POST /scan` is unauthenticated at the process; treat it as **internal-only**. Do not add service-side JWT to "fix" that.

There is no Domain → Account → Project → Office data path and no ISO country/language/currency fields.

### Threat Model Considerations
1. **Malicious File Upload**: Files are scanned before processing
2. **Container Escape**: Minimal permissions and read-only mounts
3. **Resource Exhaustion**: Configurable limits on file size and scan time
4. **Virus Database Integrity**: Regular updates with verification

## Performance Architecture

### Resource Management
```yaml
# Helm values-dev / values-eu (accepted ops baseline)
resources:
  requests:
    memory: "1800Mi"
    cpu: "300m"
  limits:
    memory: "3600Mi"
    cpu: "1200m"
```

### Scanning Optimization
```bash
# ClamAV performance tuning
MaxThreads=12           # Parallel scanning threads
MaxQueue=100           # Queue size for concurrent requests
MaxFileSize=100M       # Individual file size limit
ScanTimeout=180        # Maximum scan time per file
```

### Caching Strategy
- Virus database cached in persistent volume
- No file content caching (security requirement)
- Result caching could be implemented for identical files

## Integration Architecture

### API Design Principles
1. **RESTful Interface**: Simple POST endpoint for file scanning
2. **Query Parameter Input**: File name passed as query parameter
3. **Structured Responses**: Consistent JSON response format
4. **HTTP Status Codes**: Proper status codes for different scan results

### Response Format Standards
```json
{
  "message": "Human-readable status message",
  "code": "ErrorCode (for failures)",
  "output": "Raw ClamAV output for debugging"
}
```

### Error Handling Strategy
```csharp
// Exit code interpretation
if (process.ExitCode == 0)
    return Ok(new { Message = "File is clean.", output });
else if (process.ExitCode == 1)
    return BadRequest(new { Message = "File is infected.", Code = "InfectedFile", output });
else
    return StatusCode(500, new { Message = "An error occurred while scanning the file.", output });
```

## Deployment Architecture

### Container Orchestration
```yaml
# Kubernetes deployment pattern
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clamav
spec:
  replicas: 2
  selector:
    matchLabels:
      app: clamav-api
  template:
    metadata:
      labels:
        app: clamav-api
    spec:
      containers:
      - name: clamav-api
        image: clamav-api:latest
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
        volumeMounts:
        - name: file-storage
          mountPath: /files
          readOnly: true   # required; Helm currently sets azureFile.readOnly: false — fix the chart
        - name: virus-db
          mountPath: /var/lib/clamav
```

### Service Discovery
- Exposed through standard Kubernetes service
- Health check endpoints for load balancer integration
- Service mesh compatible (Istio, Linkerd)

### Scaling Considerations
1. **Horizontal Scaling**: Multiple replicas for load distribution
2. **Vertical Scaling**: CPU/memory scaling for large files
3. **Storage Scaling**: Shared virus database across replicas
4. **Network Scaling**: Load balancing for high throughput

## Monitoring and Observability

### Logging Strategy
```csharp
_logger.LogInformation($"File name: {fileHandler}, ClamAV output: {output}");
```

### Metrics Collection
- Scan duration per file
- File size distribution
- Virus detection rates
- Error rates by type
- Resource utilization

### Health Check Implementation
```csharp
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});
```

Readiness (`ClamavReadinessHealthCheck`) confirms `FILE_SHARE_MOUNT_PATH` exists and a clamd Unix socket accepts connections (`/run/clamav/clamd.sock` or `/tmp/clamd.sock`).
```

### Alerting Criteria
1. **High Error Rate**: > 5% scan failures
2. **Performance Degradation**: Scan time > 30 seconds
3. **Resource Exhaustion**: Memory usage > 90%
4. **Virus Database Age**: > 24 hours old

## Data Flow Architecture

### Scan Request Flow
```
1. Client → POST /scan?fileName=example.txt
2. API → Validate file path and permissions
3. API → Execute clamdscan subprocess
4. ClamAV → Scan file and return exit code
5. API → Interpret result and format response
6. Client ← JSON response with scan results
```

### File Processing Pipeline
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│  API Layer  │───▶│ ClamAV Scan │───▶│  Response   │
│   Request   │    │ Validation  │    │   Engine    │    │ Formatting  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
File reference      Path validation    Virus detection    Status + Details
```

## Configuration Management

### Environment-Based Configuration
```json
{
  "Development": {
    "Logging": { "LogLevel": { "Default": "Debug" } },
    "FILE_SHARE_MOUNT_PATH": "/tmp/test-files"
  },
  "Production": {
    "Logging": { "LogLevel": { "Default": "Information" } },
    "FILE_SHARE_MOUNT_PATH": "/files"
  }
}
```

### ClamAV Daemon Configuration
```bash
# clamd.conf production settings
LogTime yes
LogClean no              # Reduce log volume in production
LogSyslog yes
ExtendedDetectionInfo yes
MaxThreads 12
MaxQueue 100
TCPSocket 3310
MaxRequestSize 50M
```

## Maintenance and Updates

### Virus Database Updates
```bash
# Automated updates via freshclam
# Configured in freshclam.conf
DatabaseMirror db.local.clamav.net
UpdateLogFile /var/log/clamav/freshclam.log
Checks 24
```

### Container Updates
1. Monitor ClamAV base image releases
2. Test compatibility with docker-entrypoint.sh
3. Validate virus database migration
4. Rolling deployment strategy

### Backup and Recovery
- Virus database backup schedule
- Configuration backup procedures
- Disaster recovery testing

This architecture ensures the ClamAV service provides secure, scalable, and reliable virus scanning capabilities while maintaining integration compatibility with the broader Briggs System ecosystem.
