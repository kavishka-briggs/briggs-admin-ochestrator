# Keycloak Troubleshooting Guide

## Common Issues and Solutions

### 1. Provider Loading Issues

#### Problem: Custom Provider Not Loading
```
ERROR: Failed to load provider: com.briggs.keycloak.CustomProvider
```

**Diagnosis Steps:**
```bash
# Check if JAR is in the correct location
ls -la /opt/keycloak/providers/

# Check JAR contents for SPI registration
jar -tf custom-provider.jar | grep META-INF/services

# Check Keycloak startup logs
docker logs keycloak | grep -i "deployed\|provider\|error"
```

**Solutions:**
1. **Missing SPI Registration File:**
   ```bash
   # Create the service registration file
   mkdir -p src/main/resources/META-INF/services
   echo "com.briggs.keycloak.CustomProviderFactory" > \
     src/main/resources/META-INF/services/org.keycloak.provider.ProviderFactory
   ```

2. **Wrong JAR Location:**
   ```bash
   # Copy JAR to correct location
   cp target/custom-provider.jar /opt/keycloak/providers/
   
   # In Docker
   docker cp custom-provider.jar keycloak:/opt/keycloak/providers/
   ```

3. **Missing Dependencies:**
   ```xml
   <!-- Add to pom.xml -->
   <dependency>
       <groupId>org.keycloak</groupId>
       <artifactId>keycloak-server-spi</artifactId>
       <version>${keycloak.version}</version>
       <scope>provided</scope>
   </dependency>
   ```

4. **Keycloak Not Restarted:**
   ```bash
   # Restart Keycloak to load providers
   docker-compose restart keycloak
   
   # Or in Kubernetes
   kubectl rollout restart deployment/keycloak
   ```

#### Problem: Provider Class Not Found
```
ClassNotFoundException: com.briggs.keycloak.CustomProvider
```

**Solutions:**
1. **Check Package Structure:**
   ```
   src/main/java/com/briggs/keycloak/
   ├── CustomProvider.java
   ├── CustomProviderFactory.java
   └── config/
   ```

2. **Verify Manifest Dependencies:**
   ```xml
   <!-- In pom.xml maven-jar-plugin configuration -->
   <manifestEntries>
       <Dependencies>org.keycloak.keycloak-server-spi,org.keycloak.keycloak-services</Dependencies>
   </manifestEntries>
   ```

### 2. Authentication Flow Issues

#### Problem: 2FA Email Not Sending
```
User completes first authentication step but no email is received
```

**Diagnosis Steps:**
```bash
# Check SMTP configuration
docker logs keycloak | grep -i smtp

# Test SMTP connectivity
telnet smtp.gmail.com 587

# Check email authenticator logs
docker logs keycloak | grep -i "EmailAuthenticator\|email.*otp"
```

**Solutions:**
1. **SMTP Configuration:**
   ```bash
   # Verify environment variables
   docker exec keycloak env | grep SMTP
   
   # Check SMTP settings in Keycloak admin console
   # Realm Settings → Email
   ```

2. **Email Template Issues:**
   ```bash
   # Check email theme exists
   ls -la /opt/keycloak/themes/briggstheme/email/
   
   # Verify template syntax
   # Check for Freemarker syntax errors in *.ftl files
   ```

3. **Authentication Flow Configuration:**
   ```bash
   # Export realm configuration to check flow
   /opt/keycloak/bin/kc.sh export --realm briggs-system --file realm-export.json
   
   # Check if email authenticator is properly configured in flow
   grep -A 10 -B 10 "email.*authenticator" realm-export.json
   ```

#### Problem: Hybrid Authentication Failing
```
External API validation fails for Pepperminds users
```

**Diagnosis Steps:**
```bash
# Check external API connectivity
curl -X POST https://api.pepperminds.com/validate \
  -H "Content-Type: application/json" \
  -d '{"username":"pm_testuser","password":"test"}'

# Check hybrid authenticator logs
docker logs keycloak | grep -i "HybridAuth\|pepperminds"
```

**Solutions:**
1. **API Endpoint Configuration:**
   ```java
   // Check configuration in authenticator
   String apiUrl = System.getenv("PEPPERMINDS_API_URL");
   if (apiUrl == null) {
       log.error("PEPPERMINDS_API_URL not configured");
       // Fallback to standard authentication
   }
   ```

2. **Network Connectivity:**
   ```bash
   # Test from Keycloak container
   docker exec keycloak curl -v https://api.pepperminds.com/health
   
   # Check firewall rules
   # Verify SSL certificates
   ```

3. **Timeout Configuration:**
   ```java
   // Increase timeout for external API calls
   CloseableHttpClient httpClient = HttpClientBuilder.create()
       .setConnectionTimeout(10000)
       .setSocketTimeout(30000)
       .build();
   ```

### 3. Database Issues

#### Problem: Database Connection Failures
```
Cannot connect to database: Connection refused
```

**Diagnosis Steps:**
```bash
# Check database connectivity
docker exec keycloak ping postgres

# Check database credentials
docker exec keycloak env | grep KC_DB

# Test database connection
docker exec postgres psql -U keycloak -d keycloak -c "SELECT 1;"
```

**Solutions:**
1. **Connection String Issues:**
   ```bash
   # Verify database URL format
   KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
   
   # Check if database service is running
   docker-compose ps postgres
   ```

2. **Database Not Ready:**
   ```yaml
   # Add depends_on with healthcheck
   services:
     keycloak:
       depends_on:
         postgres:
           condition: service_healthy
     
     postgres:
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U keycloak"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

#### Problem: Migration Failures
```
Liquibase migration failed: Table already exists
```

**Solutions:**
1. **Clean Database:**
   ```bash
   # Drop and recreate database
   docker exec postgres psql -U postgres -c "DROP DATABASE keycloak;"
   docker exec postgres psql -U postgres -c "CREATE DATABASE keycloak OWNER keycloak;"
   ```

2. **Manual Migration:**
   ```bash
   # Force specific migration
   /opt/keycloak/bin/kc.sh start --db-migration-strategy=manual
   ```

### 4. Theme Issues

#### Problem: Custom Theme Not Applied
```
Login page shows default Keycloak theme instead of custom theme
```

**Diagnosis Steps:**
```bash
# Check theme files exist
ls -la /opt/keycloak/themes/briggstheme/

# Check theme is selected in realm
grep -i "loginTheme" realm-export.json

# Check for theme errors in logs
docker logs keycloak | grep -i theme
```

**Solutions:**
1. **Theme Selection:**
   ```bash
   # In Keycloak Admin Console:
   # Realm Settings → Themes → Login Theme: briggstheme
   ```

2. **Theme File Structure:**
   ```
   themes/briggstheme/
   ├── login/
   │   ├── theme.properties
   │   ├── template.ftl
   │   ├── login.ftl
   │   └── resources/
   ├── account/
   │   ├── theme.properties
   │   └── template.ftl
   └── email/
       ├── theme.properties
       └── html/
   ```

3. **Template Syntax Errors:**
   ```bash
   # Check Freemarker syntax
   # Common issues: missing <#import>, wrong variable names
   
   # Enable template debugging
   KC_LOG_LEVEL=DEBUG
   ```

#### Problem: CSS/JS Resources Not Loading
```
Theme displays but styling is broken
```

**Solutions:**
1. **Resource Path Issues:**
   ```html
   <!-- Use correct resource path in templates -->
   <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css">
   <script src="${url.resourcesPath}/js/app.js"></script>
   ```

2. **File Permissions:**
   ```bash
   # Check file permissions
   ls -la /opt/keycloak/themes/briggstheme/login/resources/
   
   # Fix permissions if needed
   chmod -R 644 /opt/keycloak/themes/briggstheme/login/resources/
   ```

### 5. Performance Issues

#### Problem: Slow Login Response
```
Login takes more than 10 seconds to complete
```

**Diagnosis Steps:**
```bash
# Check resource usage
docker stats keycloak

# Monitor database queries
docker logs postgres | grep "SLOW QUERY"

# Check authentication flow timing
docker logs keycloak | grep -i "execution.*took"
```

**Solutions:**
1. **Database Optimization:**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_user_email ON user_entity(email);
   CREATE INDEX idx_user_username ON user_entity(username);
   CREATE INDEX idx_user_attributes ON user_attribute(user_id, name);
   ```

2. **Connection Pool Tuning:**
   ```bash
   # Increase database connection pool
   KC_DB_POOL_INITIAL_SIZE=10
   KC_DB_POOL_MAX_SIZE=20
   KC_DB_POOL_MIN_SIZE=5
   ```

3. **JVM Tuning:**
   ```bash
   # Increase heap size
   JAVA_OPTS="-Xms1g -Xmx2g -XX:+UseG1GC"
   ```

#### Problem: High Memory Usage
```
Keycloak container using excessive memory
```

**Solutions:**
1. **Session Management:**
   ```bash
   # Reduce session timeout
   # Admin Console → Realm Settings → Sessions
   # SSO Session Idle: 30 minutes
   # SSO Session Max: 8 hours
   ```

2. **Cache Configuration:**
   ```xml
   <!-- In cache configuration -->
   <cache-container name="keycloak">
       <local-cache name="users">
           <memory>
               <object size="10000"/>
           </memory>
           <expiration interval="300000"/>
       </local-cache>
   </cache-container>
   ```

### 6. SSL/TLS Issues

#### Problem: SSL Certificate Errors
```
SSL certificate verification failed
```

**Diagnosis Steps:**
```bash
# Check certificate validity
openssl s_client -connect auth.briggs.com:443 -servername auth.briggs.com

# Check certificate in Keycloak
docker exec keycloak keytool -list -keystore /opt/keycloak/conf/server.keystore
```

**Solutions:**
1. **Certificate Installation:**
   ```bash
   # Import certificate into Java keystore
   keytool -import -alias briggs-cert \
     -file briggs.crt \
     -keystore /opt/keycloak/conf/server.keystore
   ```

2. **Proxy Configuration:**
   ```bash
   # For reverse proxy setup
   KC_PROXY=edge
   KC_HOSTNAME_STRICT=false
   ```

### 7. Integration Issues

#### Problem: JWT Token Validation Failing
```
Backend services reject Keycloak JWT tokens
```

**Diagnosis Steps:**
```bash
# Decode JWT token
echo "eyJ0eXAiOiJKV1QiLCJhbGc..." | base64 -d

# Check JWT signature
curl -s http://keycloak:8080/realms/briggs-system/protocol/openid-connect/certs

# Verify token with backend service
curl -H "Authorization: Bearer $TOKEN" \
  http://backend-api/api/test
```

**Solutions:**
1. **Clock Synchronization:**
   ```bash
   # Sync clocks between services
   ntpdate -s time.nist.gov
   
   # Check time difference
   docker exec keycloak date
   docker exec backend-api date
   ```

2. **Audience Configuration:**
   ```json
   {
     "clientId": "backend-api",
     "protocol": "openid-connect",
     "attributes": {
       "include.in.token.scope": "true",
       "display.on.consent.screen": "false"
     }
   }
   ```

3. **Algorithm Mismatch:**
   ```java
   // Ensure algorithm matches in backend
   .setSigningKey(publicKey)
   .setSigningKeyResolver(keyResolver)
   .requireIssuer("http://keycloak:8080/realms/briggs-system")
   ```

## Monitoring and Alerting

### Health Check Endpoints
```bash
# Basic health check
curl http://keycloak:8080/health

# Detailed health check
curl http://keycloak:8080/health/ready
curl http://keycloak:8080/health/live

# Metrics endpoint
curl http://keycloak:8080/metrics
```

### Log Analysis
```bash
# Monitor authentication failures
docker logs keycloak | grep -i "failed\|error" | tail -20

# Track specific user issues
docker logs keycloak | grep "username@example.com"

# Monitor provider execution
docker logs keycloak | grep -i "BriggsEventListener\|HybridAuth"
```

### Performance Monitoring
```bash
# Monitor response times
curl -w "@curl-format.txt" -s -o /dev/null http://keycloak:8080/realms/briggs-system

# Database connection monitoring
docker exec postgres psql -U keycloak -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

## Emergency Procedures

### 1. Rollback Deployment
```bash
# Kubernetes rollback
kubectl rollout undo deployment/keycloak

# Docker Compose rollback
docker-compose down
docker tag briggs-keycloak:backup briggs-keycloak:latest
docker-compose up -d
```

### 2. Database Recovery
```bash
# Restore from backup
pg_restore -U keycloak -d keycloak keycloak_backup.sql

# Point-in-time recovery
pg_basebackup -h postgres -D backup -U keycloak -P -W
```

### 3. Emergency Access
```bash
# Create emergency admin user
/opt/keycloak/bin/kc.sh start --import-realm emergency-admin.json

# Reset admin password
docker exec keycloak /opt/keycloak/bin/kc.sh reset-admin-password --password newpassword
```

## Prevention Best Practices

### 1. Monitoring Setup
- Set up alerts for authentication failures
- Monitor resource usage and performance
- Track provider execution times
- Watch for database connection issues

### 2. Testing Strategy
- Test custom providers in staging
- Validate theme changes across browsers
- Test authentication flows end-to-end
- Performance test with realistic load

### 3. Backup Strategy
- Regular database backups
- Configuration exports
- Provider JAR versioning
- Theme file versioning

### 4. Documentation
- Keep deployment procedures updated
- Document custom configuration
- Maintain troubleshooting runbooks
- Track known issues and solutions
