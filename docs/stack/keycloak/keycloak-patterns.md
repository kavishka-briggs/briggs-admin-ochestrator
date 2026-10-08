# Keycloak Patterns - Development Guidelines

## Custom Provider Patterns

### 1. Event Listener Pattern

**Use Case**: Track user activities, update attributes, trigger external systems

**Implementation Pattern:**
```java
@JBossLog
public class CustomEventListenerProvider implements EventListenerProvider {
    
    @Override
    public void onEvent(Event event) {
        switch (event.getType()) {
            case LOGIN:
                handleLogin(event);
                break;
            case REGISTER:
                handleRegistration(event);
                break;
            case LOGOUT:
                handleLogout(event);
                break;
        }
    }
    
    private void handleLogin(Event event) {
        String userId = event.getUserId();
        long timestamp = System.currentTimeMillis();
        
        // Update user attributes
        updateUserAttribute(userId, "lastLoginDate", String.valueOf(timestamp));
        
        // Log for audit
        log.infof("User %s logged in at %d", userId, timestamp);
    }
    
    private void updateUserAttribute(String userId, String key, String value) {
        try {
            UserModel user = session.users().getUserById(realm, userId);
            if (user != null) {
                user.setSingleAttribute(key, value);
            }
        } catch (Exception e) {
            log.errorf("Failed to update user attribute: %s", e.getMessage());
        }
    }
}
```

**Registration Pattern:**
```
# META-INF/services/org.keycloak.events.EventListenerProviderFactory
com.briggs.keycloak.CustomEventListenerProviderFactory
```

### 2. Custom Authenticator Pattern

**Use Case**: External API validation, multi-step authentication, conditional flows

**Implementation Pattern:**
```java
public class CustomAuthenticator implements Authenticator {
    
    @Override
    public void authenticate(AuthenticationFlowContext context) {
        String username = getUsername(context);
        
        if (shouldUseExternalValidation(username)) {
            validateWithExternalAPI(context, username);
        } else {
            context.attempted();
        }
    }
    
    private boolean shouldUseExternalValidation(String username) {
        // Pattern matching logic
        return username != null && username.startsWith("pm_");
    }
    
    private void validateWithExternalAPI(AuthenticationFlowContext context, String username) {
        try {
            ExternalAPIResponse response = callExternalAPI(username, getPassword(context));
            
            if (response.isValid()) {
                UserModel user = getOrCreateUser(context, response);
                context.setUser(user);
                context.success();
            } else {
                context.failure(AuthenticationFlowError.INVALID_CREDENTIALS);
            }
        } catch (Exception e) {
            log.errorf("External API validation failed: %s", e.getMessage());
            context.failure(AuthenticationFlowError.GENERIC_AUTHENTICATION_ERROR);
        }
    }
    
    private UserModel getOrCreateUser(AuthenticationFlowContext context, ExternalAPIResponse response) {
        UserProvider userProvider = context.getSession().users();
        UserModel user = userProvider.getUserByUsername(context.getRealm(), response.getUsername());
        
        if (user == null) {
            user = userProvider.addUser(context.getRealm(), response.getUsername());
            user.setEmail(response.getEmail());
            user.setFirstName(response.getFirstName());
            user.setLastName(response.getLastName());
            user.setEnabled(true);
        }
        
        // Update attributes from external source
        user.setSingleAttribute("externalId", response.getExternalId());
        user.setSingleAttribute("lastExternalSync", String.valueOf(System.currentTimeMillis()));
        
        return user;
    }
}
```

### 3. Required Action Pattern

**Use Case**: Force user actions like email verification, terms acceptance, profile completion

**Implementation Pattern:**
```java
public class CustomRequiredActionProvider implements RequiredActionProvider {
    
    @Override
    public void evaluateTriggers(RequiredActionContext context) {
        UserModel user = context.getUser();
        
        if (shouldTriggerAction(user)) {
            user.addRequiredAction(getId());
        }
    }
    
    @Override
    public void requiredActionChallenge(RequiredActionContext context) {
        // Create form for user input
        Response challenge = context.form()
            .setAttribute("customData", getCustomData(context.getUser()))
            .createForm("custom-action.ftl");
        context.challenge(challenge);
    }
    
    @Override
    public void processAction(RequiredActionContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        
        if (validateInput(formData)) {
            processUserAction(context.getUser(), formData);
            context.success();
        } else {
            context.challenge(createErrorResponse(context));
        }
    }
    
    private boolean shouldTriggerAction(UserModel user) {
        String lastUpdate = user.getFirstAttribute("profileLastUpdate");
        if (lastUpdate == null) return true;
        
        long lastUpdateTime = Long.parseLong(lastUpdate);
        long sixMonthsAgo = System.currentTimeMillis() - (6L * 30 * 24 * 60 * 60 * 1000);
        
        return lastUpdateTime < sixMonthsAgo;
    }
}
```

## Authentication Flow Patterns

### 1. Browser Flow with 2FA

**Pattern Structure:**
```
Browser Flow
├── Cookie Authentication (Alternative)
├── Kerberos Authentication (Alternative)
├── Identity Provider Redirector (Alternative)
└── Forms Subflow (Alternative, Required)
    ├── Username Password Form (Required)
    └── 2FA Subflow (Conditional)
        ├── Condition - User Configured (Required)
        └── Email OTP Form (Required)
```

**Configuration Pattern:**
```java
// In realm configuration
AuthenticationFlowModel browserFlow = new AuthenticationFlowModel();
browserFlow.setAlias("browser-with-2fa");
browserFlow.setDescription("Browser flow with email 2FA");
browserFlow.setProviderId("basic-flow");
browserFlow.setTopLevel(true);
browserFlow.setBuiltIn(false);

// Add executions
AuthenticationExecutionModel cookieExecution = new AuthenticationExecutionModel();
cookieExecution.setAuthenticator("auth-cookie");
cookieExecution.setRequirement(AuthenticationExecutionModel.Requirement.ALTERNATIVE);

AuthenticationExecutionModel formsExecution = new AuthenticationExecutionModel();
formsExecution.setAuthenticator("auth-username-password-form");
formsExecution.setRequirement(AuthenticationExecutionModel.Requirement.REQUIRED);

AuthenticationExecutionModel emailOtpExecution = new AuthenticationExecutionModel();
emailOtpExecution.setAuthenticator("email-otp-authenticator");
emailOtpExecution.setRequirement(AuthenticationExecutionModel.Requirement.CONDITIONAL);
```

### 2. Conditional Execution Pattern

**Use Case**: Apply authentication based on user attributes, IP address, risk score

**Pattern Implementation:**
```java
public class ConditionalAuthenticator implements ConditionalAuthenticator {
    
    @Override
    public boolean matchCondition(AuthenticationFlowContext context) {
        UserModel user = context.getUser();
        
        // Multiple conditions
        return isHighRiskUser(user) || 
               isFromUntrustedNetwork(context) || 
               requiresStrongAuth(user);
    }
    
    private boolean isHighRiskUser(UserModel user) {
        String riskLevel = user.getFirstAttribute("riskLevel");
        return "HIGH".equals(riskLevel);
    }
    
    private boolean isFromUntrustedNetwork(AuthenticationFlowContext context) {
        String clientIp = context.getConnection().getRemoteAddr();
        return !trustedNetworks.contains(getNetworkRange(clientIp));
    }
    
    private boolean requiresStrongAuth(UserModel user) {
        String roles = user.getRealmRoleMappingsStream()
                          .map(RoleModel::getName)
                          .collect(Collectors.joining(","));
        return roles.contains("admin") || roles.contains("sensitive-data-access");
    }
    
    @Override
    public void action(AuthenticationFlowContext context) {
        // This authenticator only provides conditions
        context.success();
    }
}
```

## Theme Development Patterns

### 1. Custom Login Form Pattern

**Template Structure:**
```html
<!-- themes/briggstheme/login/login.ftl -->
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("doLogIn")}
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <!-- Custom branding -->
                        <div class="briggs-logo">
                            <img src="${url.resourcesPath}/img/briggs-logo.png" alt="Briggs & Partners">
                        </div>
                        
                        <!-- Username field with custom styling -->
                        <div class="${properties.kcFormGroupClass!}">
                            <label for="username" class="${properties.kcLabelClass!}">
                                <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                            </label>
                            <input tabindex="1" id="username" class="${properties.kcInputClass!} briggs-input" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"/>
                        </div>
                        
                        <!-- Password field -->
                        <div class="${properties.kcFormGroupClass!}">
                            <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
                            <input tabindex="2" id="password" class="${properties.kcInputClass!} briggs-input" name="password" type="password" autocomplete="off"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"/>
                        </div>
                        
                        <!-- Remember me and forgot password -->
                        <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                            <div id="kc-form-options">
                                <#if realm.rememberMe && !usernameEditDisabled??>
                                    <div class="checkbox">
                                        <label>
                                            <#if login.rememberMe??>
                                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                            <#else>
                                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                            </#if>
                                        </label>
                                    </div>
                                </#if>
                            </div>
                            
                            <div class="${properties.kcFormOptionsWrapperClass!}">
                                <#if realm.resetPasswordAllowed>
                                    <span><a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                                </#if>
                            </div>
                        </div>
                        
                        <!-- Submit button -->
                        <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
                            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                            <input tabindex="4" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} briggs-submit" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
                        </div>
                    </form>
                </#if>
            </div>
        </div>
    </#elseif section = "info">
        <!-- Custom info section -->
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
```

### 2. Email Template Pattern

**HTML Email Template:**
```html
<!-- themes/briggstheme/email/html/email-verification.ftl -->
<#import "template.ftl" as layout>
<@layout.emailLayout>
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <!-- Header with branding -->
    <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
        <img src="${url.resourcesPath}/img/briggs-logo-white.png" alt="Briggs & Partners" style="height: 40px;">
    </div>
    
    <!-- Content -->
    <div style="padding: 30px 20px; background-color: #ffffff;">
        <h1 style="color: #1e3a8a; margin-bottom: 20px;">${msg("emailVerificationSubject")}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333333;">
            ${msg("emailVerificationBodyHtml", link, linkExpiration, realmName, linkExpirationFormatter(linkExpiration))}
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ${msg("emailVerificationBodyHtml")}
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666666; margin-top: 30px;">
            ${msg("emailVerificationBodyHtml")}
        </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666666;">
        <p>© ${.now?string("yyyy")} Briggs & Partners. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
    </div>
</div>
</@layout.emailLayout>
```

## Configuration Patterns

### 1. Environment-Specific Configuration

**Development Configuration:**
```yaml
# docker-compose.yml for development
version: '3.8'
services:
  keycloak:
    image: briggs-keycloak:dev
    environment:
      # Database
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: password
      
      # Admin user
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      
      # Development settings
      KC_HOSTNAME_STRICT: false
      KC_HTTP_ENABLED: true
      KC_LOG_LEVEL: DEBUG
      
      # Custom provider configuration
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
      EXTERNAL_API_URL: http://mockapi:8080
      
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - mailhog
```

**Production Configuration:**
```yaml
# helm/values-prod.yaml
keycloak:
  image:
    repository: briggs-keycloak
    tag: "1.0.0"
  
  environment:
    # Database from secret
    KC_DB: postgres
    KC_DB_URL_HOST: postgres.internal
    KC_DB_URL_DATABASE: keycloak
    KC_DB_URL_PORT: 5432
    KC_DB_USERNAME:
      valueFrom:
        secretKeyRef:
          name: keycloak-db-secret
          key: username
    KC_DB_PASSWORD:
      valueFrom:
        secretKeyRef:
          name: keycloak-db-secret
          key: password
    
    # Production settings
    KC_HOSTNAME: auth.briggs.com
    KC_PROXY: edge
    KC_LOG_LEVEL: INFO
    
    # SMTP configuration
    SMTP_HOST:
      valueFrom:
        secretKeyRef:
          name: smtp-secret
          key: host
    SMTP_USER:
      valueFrom:
        secretKeyRef:
          name: smtp-secret
          key: username
    SMTP_PASSWORD:
      valueFrom:
        secretKeyRef:
          name: smtp-secret
          key: password
  
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m
  
  persistence:
    enabled: false  # Using external database
  
  service:
    type: ClusterIP
    port: 8080
  
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: auth.briggs.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: briggs-tls
        hosts:
          - auth.briggs.com
```

### 2. Realm Configuration Pattern

**Realm Export/Import Pattern:**
```json
{
  "realm": "briggs-system",
  "enabled": true,
  "displayName": "Briggs System",
  "displayNameHtml": "<div class=\"kc-logo-text\"><span>Briggs System</span></div>",
  
  "registrationAllowed": false,
  "registrationEmailAsUsername": true,
  "resetPasswordAllowed": true,
  "rememberMe": true,
  "verifyEmail": true,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  
  "accessTokenLifespan": 900,
  "refreshTokenMaxReuse": 0,
  "ssoSessionIdleTimeout": 1800,
  "ssoSessionMaxLifespan": 28800,
  
  "loginTheme": "briggstheme",
  "accountTheme": "briggstheme",
  "emailTheme": "briggstheme",
  
  "eventsEnabled": true,
  "eventsListeners": ["jboss-logging", "briggs-event-listener"],
  "enabledEventTypes": [
    "SEND_VERIFY_EMAIL", "SEND_RESET_PASSWORD", "SEND_IDENTITY_PROVIDER_LINK",
    "RESET_PASSWORD", "LOGIN", "LOGOUT", "REGISTER", "UPDATE_PROFILE"
  ],
  
  "authenticationFlows": [
    {
      "alias": "browser-with-2fa",
      "description": "Browser flow with 2FA",
      "providerId": "basic-flow",
      "topLevel": true,
      "builtIn": false,
      "authenticationExecutions": [
        {
          "authenticator": "auth-cookie",
          "requirement": "ALTERNATIVE",
          "priority": 10
        },
        {
          "authenticator": "auth-username-password-form",
          "requirement": "REQUIRED",
          "priority": 20
        },
        {
          "authenticator": "email-otp-authenticator",
          "requirement": "CONDITIONAL",
          "priority": 30
        }
      ]
    }
  ],
  
  "clients": [
    {
      "clientId": "briggs-frontend",
      "enabled": true,
      "protocol": "openid-connect",
      "publicClient": true,
      "redirectUris": [
        "http://localhost:3000/*",
        "https://*.briggs.com/*"
      ],
      "webOrigins": [
        "http://localhost:3000",
        "https://*.briggs.com"
      ],
      "attributes": {
        "pkce.code.challenge.method": "S256"
      }
    }
  ]
}
```

## Testing Patterns

### 1. Unit Testing Pattern

```java
@ExtendWith(MockitoExtension.class)
class BriggsEventListenerTest {
    
    @Mock
    private KeycloakSession session;
    
    @Mock
    private RealmModel realm;
    
    @Mock
    private UserProvider userProvider;
    
    @Mock
    private UserModel user;
    
    @InjectMocks
    private BriggsEventListener eventListener;
    
    @Test
    void shouldUpdateLastLoginDateOnLoginEvent() {
        // Given
        Event loginEvent = createLoginEvent("user-123");
        when(session.users()).thenReturn(userProvider);
        when(userProvider.getUserById(realm, "user-123")).thenReturn(user);
        
        // When
        eventListener.onEvent(loginEvent);
        
        // Then
        verify(user).setSingleAttribute(eq("lastLoginDate"), anyString());
    }
    
    @Test
    void shouldHandleUserNotFoundGracefully() {
        // Given
        Event loginEvent = createLoginEvent("nonexistent-user");
        when(session.users()).thenReturn(userProvider);
        when(userProvider.getUserById(realm, "nonexistent-user")).thenReturn(null);
        
        // When/Then - should not throw exception
        assertDoesNotThrow(() -> eventListener.onEvent(loginEvent));
    }
    
    private Event createLoginEvent(String userId) {
        Event event = new Event();
        event.setType(EventType.LOGIN);
        event.setUserId(userId);
        event.setRealmId("test-realm");
        event.setTime(System.currentTimeMillis());
        return event;
    }
}
```

### 2. Integration Testing Pattern

```java
@KeycloakIntegrationTest
class EmailOtpAuthenticatorIntegrationTest {
    
    @Test
    void shouldSendOtpEmailAndValidateCorrectCode() {
        // Given
        String username = "testuser@example.com";
        String password = "password123";
        
        // Login first step
        LoginResponse loginResponse = keycloakTestClient.login(username, password);
        assertThat(loginResponse.isRequires2FA()).isTrue();
        
        // Check email was sent
        EmailMessage sentEmail = emailTestClient.getLastEmailFor(username);
        assertThat(sentEmail.getSubject()).contains("Verification Code");
        
        String otpCode = extractOtpFromEmail(sentEmail.getBody());
        
        // Complete 2FA
        TokenResponse tokenResponse = keycloakTestClient.submitOtp(loginResponse.getSessionId(), otpCode);
        
        // Then
        assertThat(tokenResponse.getAccessToken()).isNotNull();
        assertThat(tokenResponse.getRefreshToken()).isNotNull();
    }
    
    @Test
    void shouldRejectInvalidOtpCode() {
        // Given
        String username = "testuser@example.com";
        String password = "password123";
        
        // Login first step
        LoginResponse loginResponse = keycloakTestClient.login(username, password);
        
        // Submit invalid OTP
        AuthenticationException exception = assertThrows(
            AuthenticationException.class,
            () -> keycloakTestClient.submitOtp(loginResponse.getSessionId(), "invalid-code")
        );
        
        assertThat(exception.getMessage()).contains("Invalid verification code");
    }
}
```

## Deployment Patterns

### 1. Blue-Green Deployment Pattern

```yaml
# Blue-Green deployment strategy
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: keycloak
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: keycloak-active
      previewService: keycloak-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 30
      prePromotionAnalysis:
        templates:
        - templateName: health-check
        args:
        - name: service-name
          value: keycloak-preview
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: keycloak-active
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
      - name: keycloak
        image: briggs-keycloak:{{.Values.image.tag}}
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
```

### 2. Configuration Management Pattern

```yaml
# ConfigMap for environment-specific settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-config
data:
  KC_HOSTNAME: "auth.briggs.com"
  KC_PROXY: "edge"
  KC_HTTP_ENABLED: "false"
  KC_LOG_LEVEL: "INFO"
  KC_METRICS_ENABLED: "true"
  KC_HEALTH_ENABLED: "true"
  
  # Custom provider configuration
  EXTERNAL_API_TIMEOUT: "5000"
  OTP_EXPIRY_MINUTES: "5"
  EMAIL_TEMPLATE_VERSION: "v2"

---
# Secret for sensitive configuration
apiVersion: v1
kind: Secret
metadata:
  name: keycloak-secrets
type: Opaque
stringData:
  KC_DB_PASSWORD: "secure-db-password"
  SMTP_PASSWORD: "smtp-app-password"
  EXTERNAL_API_KEY: "external-api-secret-key"
  JWT_SIGNING_KEY: "base64-encoded-key"
```

This comprehensive patterns guide provides reusable solutions for common Keycloak development scenarios in the Briggs System architecture.
