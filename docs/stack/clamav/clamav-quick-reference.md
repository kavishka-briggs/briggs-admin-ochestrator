# ClamAV Stack - Quick Reference

**CANONICAL SOURCE**: ClamAV-specific ports, environment variables, and configuration.

## 1. ClamAV Ports & URLs

| Service | Development | Container | Notes |
|---------|-------------|-----------|--------|
| ClamAV API | 8080 | 8080 | Standard container port |
| ClamAV Daemon | 3310 | 3310 | Internal ClamAV daemon |

### Development URLs
```bash
Local API (launchSettings):  http://localhost:5186
Local compose host port:     http://localhost:5900  # compose.yml maps 5900:8080
Container API:               http://localhost:8080
Liveness:                    http://localhost:8080/health/live
Readiness:                   http://localhost:8080/health/ready
Scan Endpoint:               http://localhost:8080/scan?fileName=example.txt
```

## 2. Environment Variables

### Required Variables
```bash
# File Share Configuration
FILE_SHARE_MOUNT_PATH="/files"              # Code default; Helm sets this
TEMP_SHARE_MOUNT_PATH="/tmpfiles"           # Helm temp Azure File subPath

# Entrypoint patches clamd.conf from CLAMD_CONF_<Key> (not a conf file path)
# Example: CLAMD_CONF_MaxThreads=12

# Logging
Logging__LogLevel__Default=Information
Logging__LogLevel__Microsoft.AspNetCore=Warning
```

### Optional Variables
```bash
# ClamAV Performance Tuning
CLAMD_MAX_THREADS=12                         # Maximum number of threads
CLAMD_MAX_QUEUE=100                          # Maximum queue size
CLAMD_TIMEOUT=180                            # Scan timeout in seconds

# API Configuration
ASPNETCORE_ENVIRONMENT=Development           # Environment setting
ASPNETCORE_URLS=http://+:8080               # Binding URLs
```

## 3. Docker Configuration

### Container Build Arguments
```bash
# Base images used
SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:10.0
RUNTIME_IMAGE=clamav/clamav-debian:1.4
```

### Volume Mounts
```bash
# Required mounts for file scanning
/tmp/files:/files:ro                         # Read-only file access for scanning
/var/lib/clamav:/var/lib/clamav             # Virus database storage
/run/clamav:/run/clamav                     # Socket: /run/clamav/clamd.sock
```

## 4. ClamAV Commands

### Basic ClamAV Operations
```bash
# Scan a single file
clamdscan --no-summary --stdout "/path/to/file"

# Update virus definitions
freshclam

# Check ClamAV daemon status
clamdtop

# Manual virus database update
freshclam --verbose
```

### Container Operations
```bash
# Build ClamAV container
docker build -t clamav-api .

# Run ClamAV container with file mount
docker run -p 8080:8080 -v /host/files:/files:ro clamav-api

# Run with docker-compose
docker-compose up -d
```

## 5. API Endpoints

### Scan Endpoint
```http
POST /scan?fileName=example.txt
Content-Type: application/json

# Response (Clean file)
{
  "message": "File is clean.",
  "output": "/files/example.txt: OK"
}

# Response (Infected file)
{
  "message": "File is infected.",
  "code": "InfectedFile",
  "output": "/files/virus.txt: Eicar-Test-Signature FOUND"
}

# Response (Error)
{
  "message": "An error occurred while scanning the file.",
  "output": "Error details"
}
```

## 6. Common Configuration

### appsettings.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "FILE_SHARE_MOUNT_PATH": "/files"
}
```

### ClamAV Configuration (clamd.conf)
```bash
LogFile /var/log/clamav/clamav.log
LogTime yes
LogClean yes
LogSyslog yes
LogRotate yes
ExtendedDetectionInfo yes
PidFile /run/clamav/clamd.pid
DatabaseDirectory /var/lib/clamav
LocalSocket /run/clamav/clamd.sock
TCPSocket 3310
MaxThreads 12
MaxQueue 100
MaxRequestSize 50M
```

## 7. Health Checks

### Container Health Check
```bash
# Check if ClamAV daemon is running
ps aux | grep clamd

# Check if API is responding
curl -f http://localhost:8080/health/live || exit 1
curl -f http://localhost:8080/health/ready || exit 1

# Check virus database age
stat /var/lib/clamav/main.cvd
```

### Kubernetes Health Check
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 15

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

startupProbe:
  httpGet:
    path: /health/ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 24
```

## 8. Performance Considerations

### Resource Requirements
```yaml
# Minimum requirements
requests:
  memory: "512Mi"
  cpu: "250m"

# Recommended for production
limits:
  memory: "2Gi"
  cpu: "1000m"
```

### File Size Limits
```bash
# Maximum file size for scanning (configurable)
MaxFileSize 100M
MaxScanSize 100M
MaxRecursion 10
MaxFiles 10000
```

## 9. Security Considerations

### File Access
- Files are mounted read-only to prevent modification
- Temporary files are cleaned up after scanning
- No file content is stored permanently

### Authentication
- No service-side JWT. Internal ClusterIP only. Do not add `AddJwtBearer`

### Container Security
```dockerfile
# API must drop to clamav (entrypoint setpriv). Do not treat Helm runAsUser: 0 as accepted.
FROM clamav/clamav-debian:1.4
EXPOSE 8080
```

Scan share must be `:ro`. Helm `azureFile.readOnly: false` and compose without `:ro` violate the contract.

## 10. Troubleshooting Quick Commands

```bash
# Check ClamAV daemon logs
docker logs <container-id>

# Check virus database status
docker exec <container-id> cat /var/lib/clamav/daily.cvd

# Test file scanning manually
docker exec <container-id> clamdscan /files/test.txt

# Update virus definitions manually
docker exec <container-id> freshclam
```
