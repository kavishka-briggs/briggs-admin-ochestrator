# ClamAV Troubleshooting Guide

**Quick Navigation:**
- **Basic Setup**: See `clamav-quick-reference.md`
- **Architecture**: See `clamav-architecture.md`
- **Patterns**: See `clamav-patterns.md`

This document provides solutions to common issues when working with the ClamAV antivirus service.

## Container Issues

### Problem: Container Won't Start
```bash
# Symptoms
docker: Error response from daemon: failed to create shim task
Container exits immediately with code 125
```

**Solution 1: Check Docker Entrypoint**
```bash
# Verify entrypoint script permissions
ls -la docker-entrypoint.sh
# Should show: -rwxr-xr-x

# If not executable, fix permissions
chmod +x docker-entrypoint.sh

# Rebuild container
docker build -t clamav-api .
```

**Solution 2: Verify Base Image Compatibility**
```bash
# Check if base image is available
docker pull clamav/clamav-debian:1.4

# Test base image functionality
docker run --rm clamav/clamav-debian:1.4 /bin/bash -c "which clamdscan"
```

**Solution 3: Check Docker Build Context**
```bash
# Ensure docker-entrypoint.sh exists in build context
ls -la | grep docker-entrypoint.sh

# Verify Dockerfile COPY commands
cat Dockerfile | grep COPY
```

### Problem: ClamAV Daemon Not Starting
```bash
# Symptoms
ERROR: Can't connect to clamd
ERROR: Can't get version of clamd
```

**Solution 1: Check Daemon Status**
```bash
# Inside container, check if clamd is running
docker exec -it <container-id> ps aux | grep clamd

# Check clamd logs
docker exec -it <container-id> cat /var/log/clamav/clamav.log

# Manually start clamd if needed
docker exec -it <container-id> clamd
```

**Solution 2: Verify Configuration**
```bash
# Check clamd configuration
docker exec -it <container-id> cat /etc/clamav/clamd.conf

# Verify socket permissions
docker exec -it <container-id> ls -la /run/clamav/
```

**Solution 3: Fix Permissions**
```bash
# Ensure proper ownership
docker exec -it <container-id> chown -R clamav:clamav /run/clamav /var/lib/clamav

# Verify directory structure
docker exec -it <container-id> ls -la /run/clamav/
```

## Virus Database Issues

### Problem: Virus Database Not Updated
```bash
# Symptoms
WARNING: Virus database is older than 7 days
ERROR: Database load failed
```

**Solution 1: Manual Database Update**
```bash
# Update virus database manually
docker exec -it <container-id> freshclam

# Check database files
docker exec -it <container-id> ls -la /var/lib/clamav/

# Verify database age
docker exec -it <container-id> stat /var/lib/clamav/daily.cvd
```

**Solution 2: Fix Freshclam Configuration**
```bash
# Check freshclam configuration
docker exec -it <container-id> cat /etc/clamav/freshclam.conf

# Test freshclam connectivity
docker exec -it <container-id> freshclam --stdout

# Check network connectivity
docker exec -it <container-id> ping db.local.clamav.net
```

**Solution 3: Volume Mount Issues**
```bash
# Ensure persistent volume for database
docker volume create clamav-db

# Mount volume correctly
docker run -v clamav-db:/var/lib/clamav clamav-api

# Check volume permissions
docker exec -it <container-id> ls -la /var/lib/clamav/
```

### Problem: Database Corruption
```bash
# Symptoms
ERROR: Corrupted database detected
LibClamAV Error: Can't load database
```

**Solution: Clean and Rebuild Database**
```bash
# Stop container
docker stop <container-id>

# Remove corrupted database files
docker exec -it <container-id> rm -f /var/lib/clamav/*.cvd /var/lib/clamav/*.cld

# Restart container (will trigger fresh download)
docker start <container-id>

# Monitor download progress
docker logs -f <container-id>
```

## File Scanning Issues

### Problem: File Not Found Errors
```bash
# Symptoms
HTTP 404: File not found
"File does not exist" in logs
```

**Solution 1: Check File Mount**
```bash
# Verify file exists on host
ls -la /host/path/to/files/

# Check container mount
docker exec -it <container-id> ls -la /files/

# Verify mount syntax in docker run
docker run -v /host/files:/files:ro clamav-api
```

**Solution 2: File Path Validation**
```bash
# Check file path construction
# In logs, verify: "File name: /files/example.txt"

# Test with simple filename
curl -X POST "http://localhost:8080/scan?fileName=test.txt"

# Avoid path traversal characters
# Don't use: ../../../etc/passwd
# Use: simple-filename.txt
```

### Problem: Permission Denied Errors
```bash
# Symptoms
HTTP 403: Access denied
"Permission denied" in ClamAV output
```

**Solution 1: Fix File Permissions**
```bash
# On host system
chmod 644 /host/files/*
chown root:root /host/files/*

# Inside container
docker exec -it <container-id> ls -la /files/
docker exec -it <container-id> stat /files/example.txt
```

**Solution 2: Container User Permissions**
```bash
# Verify container runs as clamav user
docker exec -it <container-id> whoami
# Should output: clamav

# Check if clamav user can read files
docker exec -it <container-id> sudo -u clamav cat /files/test.txt
```

### Problem: Large File Timeout
```bash
# Symptoms
HTTP 500: Scan timeout
Process takes too long to complete
```

**Solution 1: Increase Timeout Settings**
```bash
# In clamd.conf
MaxFileSize 200M
MaxScanSize 200M
MaxRecursion 20
MaxFiles 15000

# Rebuild container with new config
docker build -t clamav-api .
```

**Solution 2: Optimize Scanning Performance**
```bash
# Increase thread count
MaxThreads 16

# Adjust queue size
MaxQueue 200

# Enable bytecode scanning (if needed)
Bytecode yes
```

## API Issues

### Problem: API Not Responding
```bash
# Symptoms
Connection refused on port 8080
API endpoints return 404
```

**Solution 1: Check Port Binding**
```bash
# Verify port mapping
docker ps | grep clamav-api
# Should show: 0.0.0.0:8080->8080/tcp

# Test port accessibility
curl -f http://localhost:8080/health/live
curl -f http://localhost:8080/health/ready

# Check if process is listening
docker exec -it <container-id> netstat -tlnp | grep 8080
```

**Solution 2: Application Startup Issues**
```bash
# Check application logs
docker logs <container-id>

# Look for startup errors
docker logs <container-id> 2>&1 | grep -i error

# Verify .NET application is running
docker exec -it <container-id> ps aux | grep clamav-api
```

### Problem: JSON Parsing Errors
```bash
# Symptoms
HTTP 400: Bad Request
"Invalid JSON format" errors
```

**Solution: Check Request Format**
```bash
# Correct request format
curl -X POST "http://localhost:8080/scan?fileName=test.txt" \
     -H "Content-Type: application/json"

# Verify query parameter encoding
curl -X POST "http://localhost:8080/scan?fileName=test%20file.txt"

# Check response format
{
  "message": "File is clean.",
  "output": "/files/test.txt: OK"
}
```

## Performance Issues

### Problem: Slow Scanning Performance
```bash
# Symptoms
Scan takes > 30 seconds for small files
High CPU usage
Memory exhaustion
```

**Solution 1: Resource Optimization**
```bash
# Increase container resources
docker run --memory=2g --cpus=2 clamav-api

# Monitor resource usage
docker stats <container-id>

# Check system resources
docker exec -it <container-id> top
```

**Solution 2: ClamAV Tuning**
```bash
# Optimize clamd.conf
MaxThreads 8
MaxQueue 50
ScanArchive no          # Disable if not needed
ScanPE no              # Disable if not scanning Windows files
ScanOLE2 no            # Disable if not scanning Office files
```

### Problem: Memory Leaks
```bash
# Symptoms
Container memory usage grows over time
Out of memory errors
Container restarts frequently
```

**Solution 1: Monitor and Restart**
```bash
# Add health check with memory monitoring
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/health/ready && \
      [ $(cat /proc/meminfo | grep MemAvailable | awk '{print $2}') -gt 100000 ]

# Implement automatic restart policy
docker run --restart=unless-stopped clamav-api
```

**Solution 2: Optimize Application**
```csharp
// Implement proper disposal patterns
using var process = new Process { StartInfo = startInfo };
using var fileStream = File.OpenRead(filePath);

// Add memory limits to scanning
MaxFileSize 50M
MaxScanSize 50M
```

## Kubernetes (custom chart)

`clamav-api` ships `helm/` in the service repo (`Chart.yaml` appVersion `10.0.0`, `values-dev.yaml` / `values-eu.yaml`). It is **not** the shared `plugin-deploy` `helm/backend` chart. ClusterIP `port: 80` targets container `8080`. Probes: `/health/ready` and `/health/live`. Keep `azureFile.readOnly: true` on the `files` volume and do not set `runAsUser: 0` on the app container.

## Kubernetes Deployment Issues

### Problem: Pod Startup Failures
```yaml
# Symptoms
CrashLoopBackOff status
Init containers failing
```

**Solution 1: Check Resource Limits**
```yaml
resources:
  requests:
    memory: "1800Mi"
    cpu: "300m"
  limits:
    memory: "3600Mi"
    cpu: "1200m"
```

**Solution 2: Fix Volume Mounts**
```yaml
# Ensure proper volume configuration
volumeMounts:
- name: file-storage
  mountPath: /files
  readOnly: true
- name: virus-db
  mountPath: /var/lib/clamav
  
volumes:
- name: file-storage
  persistentVolumeClaim:
    claimName: file-storage-pvc
- name: virus-db
  persistentVolumeClaim:
    claimName: clamav-db-pvc
```

**Solution 3: Security Context**
```yaml
securityContext:
  runAsUser: 100        # clamav user ID — required. Helm today uses 0; fix the chart
  runAsGroup: 101       # clamav group ID
  fsGroup: 101
  runAsNonRoot: true
  allowPrivilegeEscalation: false
```

## Debug Commands

### Container Debugging
```bash
# Get shell access to container
docker exec -it <container-id> /bin/bash

# Check all processes
ps aux

# Check network connectivity
netstat -tlnp

# Check disk space
df -h

# Check memory usage
free -h

# Check system logs
journalctl -f
```

### ClamAV Specific Debugging
```bash
# Test ClamAV directly
clamdscan --version
clamdscan /files/test.txt

# Check daemon connection
clamdscan --ping

# Verbose scanning
clamdscan --verbose /files/test.txt

# Check configuration
clamd --config-check
```

### Application Debugging
```bash
# Check .NET application status
ps aux | grep clamav-api

# Check application logs
cat /var/log/clamav-api.log

# Test API endpoints manually
curl -X POST "http://localhost:8080/scan?fileName=test.txt"
curl "http://localhost:8080/health/live"
curl "http://localhost:8080/health/ready"

# Check OpenAPI documentation
curl "http://localhost:8080/scalar/v1"
```

## Prevention Best Practices

### Regular Maintenance
```bash
# Update virus database daily
0 2 * * * docker exec clamav-container freshclam

# Monitor disk space
*/15 * * * * df -h | grep -E '9[0-9]%' && echo "Disk space warning"

# Rotate logs
0 0 * * 0 docker exec clamav-container logrotate /etc/logrotate.conf
```

### Monitoring Setup
```bash
# Health check endpoint
curl -f http://localhost:8080/health/live
curl -f http://localhost:8080/health/ready

# Resource monitoring
docker stats --no-stream clamav-api

# Log monitoring
tail -f /var/log/clamav/clamav.log | grep -E "(ERROR|WARNING)"
```

### Backup Procedures
```bash
# Backup virus database
docker cp clamav-container:/var/lib/clamav ./clamav-backup/

# Backup configuration
docker cp clamav-container:/etc/clamav ./config-backup/

# Test restore procedure
docker cp ./clamav-backup/ clamav-container:/var/lib/clamav
```

Use these troubleshooting steps systematically, starting with the most common issues and working toward more complex solutions. Always check logs first, as they often provide the most direct path to resolution.
