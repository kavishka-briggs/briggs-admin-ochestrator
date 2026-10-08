# Keycloak Stack - Quick Reference

## Repository Structure
```
auth/
├── providers/                  # Custom Keycloak providers
│   ├── briggs-event-listener/     # User login tracking
│   ├── briggs-hybrid-authentication/  # Pepperminds API integration
│   └── keycloak-2fa-email/        # Email-based 2FA
├── themes/                     # Custom Keycloak themes
│   └── briggstheme/               # Briggs custom theme
├── docker-compose.yml          # Local development setup
├── Dockerfile                  # Container build
└── helm/                      # Kubernetes deployment charts
```

## Essential Commands

### Local Development
```bash
# Build all providers
cd providers/briggs-event-listener && mvn clean package
cd ../briggs-hybrid-authentication && mvn clean package  
cd ../keycloak-2fa-email && mvn clean package

# Start Keycloak with Docker Compose
docker-compose up -d

# Build custom container
docker build -t keycloak-briggs .

# Watch logs
docker-compose logs -f keycloak
```

### Provider Development
```bash
# Build specific provider
cd providers/{provider-name}
mvn clean package

# Copy JAR to Keycloak (if running locally)
cp target/*.jar /opt/keycloak/providers/

# Restart Keycloak to load provider
docker-compose restart keycloak
```

### Theme Development
```bash
# Theme files location
themes/briggstheme/
├── login/          # Login pages
├── account/        # Account management
├── email/          # Email templates
└── admin/          # Admin console (optional)

# No build step required - themes are loaded directly
# Restart Keycloak to apply changes
docker-compose restart keycloak
```

## Configuration Files

### Environment Variables (.env)
```bash
# Database
KEYCLOAK_DB_HOST=localhost
KEYCLOAK_DB_NAME=keycloak
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=password

# Admin User
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# SMTP for Email 2FA
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
```

### Provider Configuration
Each provider includes:
- `pom.xml` - Maven build configuration
- `src/main/java/` - Java source code
- `src/main/resources/META-INF/services/` - SPI registration

## Key Endpoints

### Standard Keycloak Endpoints
```
# Admin Console
http://localhost:8080/admin

# Realm Login
http://localhost:8080/realms/{realm-name}/protocol/openid-connect/auth

# Token Endpoint
http://localhost:8080/realms/{realm-name}/protocol/openid-connect/token

# User Info
http://localhost:8080/realms/{realm-name}/protocol/openid-connect/userinfo

# Logout
http://localhost:8080/realms/{realm-name}/protocol/openid-connect/logout
```

### Health Checks
```
# Health Check
http://localhost:8080/health

# Metrics (if enabled)
http://localhost:8080/metrics
```

## Custom Providers Overview

### Briggs Event Listener
- **Purpose**: Track user login dates and update user attributes
- **Triggers**: LOGIN, REGISTER events
- **Configuration**: None required (automatic)

### Briggs Hybrid Authentication
- **Purpose**: Validate Pepperminds users via external API
- **Configuration**: Requires API endpoint configuration in realm settings
- **Usage**: Automatic for users with specific prefix patterns

### Keycloak 2FA Email
- **Purpose**: Email-based two-factor authentication with OTP
- **Configuration**: SMTP settings required
- **Usage**: Enable in authentication flows

## Common Tasks

### Adding a New Custom Provider
1. Create new directory in `providers/`
2. Copy `pom.xml` template and update dependencies
3. Implement required SPI interfaces
4. Add service registration files
5. Build with `mvn clean package`
6. Deploy JAR to Keycloak providers directory

### Updating Themes
1. Modify files in `themes/briggstheme/`
2. Restart Keycloak container
3. Clear browser cache
4. Test changes in incognito mode

### Debugging
```bash
# View Keycloak logs
docker-compose logs -f keycloak

# Enable debug logging (in standalone.xml or docker-compose)
<logger category="com.briggs" level="DEBUG"/>

# Check provider loading
# Look for "Deployed" messages in logs for custom providers
```

## Integration Points

### With Gateway (KrakenD)
- JWT token validation
- OIDC discovery endpoint
- Token introspection

### With Frontend Applications
- OIDC implicit/authorization code flow
- Silent refresh
- Single logout

### With Backend Services
- JWT token validation
- User info retrieval
- Role-based authorization

## Deployment

### Development
```bash
# Local with Docker Compose
docker-compose up -d

# Port: 8080
# Admin: admin/admin
```

### Production
```bash
# Build production image
docker build -t briggs-keycloak:latest .

# Deploy with Helm
helm upgrade --install keycloak-auth ./helm \
  --values helm/values-prod.yaml \
  --namespace auth
```

## Troubleshooting Quick Fixes

### Provider Not Loading
- Check JAR is in `/opt/keycloak/providers/`
- Verify SPI registration files exist
- Check Keycloak logs for errors
- Ensure Keycloak is restarted after provider addition

### Theme Not Applied
- Verify theme is selected in realm settings
- Clear browser cache
- Check theme file structure matches Keycloak expectations
- Restart Keycloak container

### Email 2FA Not Working
- Verify SMTP configuration
- Check email template configuration
- Test SMTP connectivity
- Review authentication flow configuration

### Authentication Failures
- Check realm configuration
- Verify client configuration
- Review authentication flow settings
- Check user attributes and roles
