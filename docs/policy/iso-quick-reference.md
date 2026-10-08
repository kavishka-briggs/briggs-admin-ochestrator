# ISO 27001 Quick Reference

**INSTANT ACCESS**: Quick security guidance for developers and AI agents.

> **AI OPTIMIZATION**: Fast lookup for common security questions and compliance checks.

---

## 🚀 **Quick Security Checklist**

### Before Any Development
- [ ] **Authentication**: Verify KrakenD-only pattern (no service JWT validation)
- [ ] **Data Classification**: Identify if personal data is involved
- [ ] **Environment**: Confirm development environment isolation
- [ ] **Change Type**: Determine if full ISO assessment required

### Critical Security Rules
- ❌ **NO JWT validation in services** - Only KrakenD validates tokens
- ✅ **Extract user context from headers** - Use `x-sub`, `x-user-roles`, etc.
- ✅ **Personal data encryption** - All personal data encrypted at rest across all components
- ✅ **2FA for frontend apps** - All React microfrontends require Keycloak MFA
- ✅ **ISO data formats MANDATORY** - Use ISO 3166-1 alpha-2 (countries), ISO 639-1 (languages), ISO 4217 (currencies)

---

## 🔐 **Authentication Quick Guide**

### KrakenD Gateway Pattern *(CRITICAL)*
```csharp
// ✅ CORRECT: Extract user context from headers
var userId = Request.Headers["x-sub"].FirstOrDefault();
var userRoles = Request.Headers["x-user-roles"].FirstOrDefault()?.Split(',');

// ❌ WRONG: Do NOT implement JWT validation
// builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
//     .AddJwtBearer(...);
```

### Service Authentication Checklist
- [ ] Service reads user context from KrakenD headers
- [ ] No `AddAuthentication()` or `AddJwtBearer()` calls
- [ ] No JWT validation libraries imported
- [ ] Business authorization based on user context only

---

## 📊 **System Overview**

### Briggs System Components
| Component Category | 2FA Required | Environment | Data Type |
|-------------------|-------------|-------------|-----------|
| **Frontend Modules** | ✅ Yes (Keycloak) | Dev/Test/Prod | Personal Data |
| **Core Infrastructure** | ✅ Yes (Gateway) | Dev/Test/Prod | Configuration |
| **PTTN Microservices** | 🔑 Gateway Auth | Dev/Test/Prod | Personal Data |
| **System Components** | 🔑 Gateway Auth | Dev/Test/Prod | Mixed |
| **Shared Infrastructure** | 🔑 Internal Auth | Dev/Test/Prod | Configuration |

### Key Components by Category
#### Core Infrastructure
- **briggs-orchestrator**: React shell with MFA via Keycloak
- **briggs-gateway-api**: KrakenD gateway (JWT validation point)
- **auth**: Keycloak identity provider with 2FA
- **briggsbase**: System configuration API
- **briggs-modules-authentication**: Authentication module (policy alias: `module-authenticator`)

#### PTTN Microservices  
- **pttn-projectsapi**: Project management API
- **pttn-onboarding-api**: User/organization onboarding
- **pttn-crewapi**: Crew member management
- **pttn-planningapi**: Shift planning and team management (older docs: `pttn-planning-api`)
- **pttn-formsapi**: Form configuration and rendering (older docs: `pttn-forms-api`)
- **pttn-authapi**: KrakenD grant lookup API (domains/projects/offices; no JWT)

#### System Components
- **clamav-api**: Antivirus scan API (.NET 10; no JWT)
- **cdc-pttn**: PTTN CDC poller (.NET 9 Azure Function; no JWT)
- **cdc-agencysuite**: AgencySuite CDC poller (.NET 10 Azure Function; no JWT)
- **pttn-address-projection**: Nightly NL address read-model rebuild (Azure Functions isolated worker; no HTTP API, no service JWT)
- **file-upload-api**: Secure file upload and voice-log ingest (.NET 9; no service JWT)
- **field-apis**: SMS, Loqate, IBAN/email helpers (.NET 10; JwtHelper must be removed; no AddJwtBearer)

#### Frontend Modules (All use Keycloak MFA)
- **module-onboarding**: User onboarding wizard
- **module-projectwizard**: Project creation wizard
- **module-dashboardbasic**: Main dashboard interface (GitHub: `modules-dashboardbasic`)
- **module-projectbasic**: Project data visualization
- **modules-crewbasic**: Crew management interface (plugin_id `module-crewbasic`)
- **modules-quartercompletion**: Quarter completion plugin monorepo (plugin_id `module-quartercompletion`)
- **modules-forms**: Field form renderer (GitHub: `modules-forms`, plugin_id `module-forms`)

### Development & Infrastructure
- **Internal Team**: All Briggs System development and maintenance
- **Cloud Provider**: Kubernetes infrastructure and monitoring
- **Koppelplatform**: PHP/Laravel integrator (PTTN HTTP reads with API token; not KrakenD JWT)
- **DWH**: PHP 8.3 / Laravel 10 warehouse (PTTN SQL reads into MySQL `dwh8`; Sanctum/session, not KrakenD JWT)

---

## 🛡️ **Security Controls Summary**

### Data Protection
- **Encryption at Rest**: TDE for PTTN databases, database-level encryption for system databases
- **Personal Data**: Additional encryption layer for all personal data across all components
- **Backups**: All backups encrypted across all environments
- **Logs**: Security event logging via briggslogging service with protection

### Access Control
- **Password Policy**: 8+ chars, mixed case, numbers, special chars (via Keycloak)
- **2FA**: Mandatory for all frontend applications via Keycloak authenticator apps
- **Account Management**: Personal accounts with unique emails required (Keycloak managed)
- **API Security**: Gateway-based authentication with header propagation and domain isolation

### Monitoring
- **User Activity**: All frontend interactions logged via briggslogging service with timestamps and user context
- **Data Changes**: Personal data modifications tracked across all PTTN microservices
- **API Access**: All API calls logged via KrakenD gateway with IP addresses and response times
- **Infrastructure**: 24/7 monitoring via Azure Log Services, Prometheus, and Grafana for Kubernetes/database monitoring
- **Cloud Provider**: Infrastructure component health logging (hardware, network, storage only)

### Monitoring Stack Architecture
- **briggslogging**: User interaction audit trails for frontend applications
- **Azure Log Services**: Kubernetes cluster and database monitoring
- **Prometheus**: Metrics collection for microservices and infrastructure
- **Grafana**: Monitoring dashboards and alerting
- **Cloud Provider**: Infrastructure component health (not application logging)

---

## ⚡ **Common Security Patterns**

### Personal Data Handling
```csharp
// Encryption check
if (containsPersonalData) {
    // Verify database-level encryption enabled
    // Implement data minimization
    // Apply retention policies
}
```

### Input Validation
```csharp
// Always validate both client and server side
[Required]
[StringLength(100, MinimumLength = 1)]
public string UserInput { get; set; }

// Server-side validation
if (!ModelState.IsValid) {
    return BadRequest(ModelState);
}
```

### Audit Logging
```csharp
// Log security-relevant events to briggslogging service
logger.LogInformation("User {UserId} accessed {Resource} from {IP} via domain {Domain}", 
    userId, resourceName, ipAddress, userDomain);
```

### ISO Data Format Standards *(MANDATORY)*
```csharp
// ✅ CORRECT: ISO standardized data formats
public class LocationRequest 
{
    [Required]
    [RegularExpression("^[A-Z]{2}$")]
    public string CountryCode { get; set; } = string.Empty; // ISO 3166-1 alpha-2
    
    [RegularExpression("^[a-z]{2}$")]
    public string? LanguageCode { get; set; } // ISO 639-1
    
    [RegularExpression("^[A-Z]{3}$")]
    public string? CurrencyCode { get; set; } // ISO 4217
}

// ❌ WRONG: Non-standard formats
// country: "Netherlands" → Use countryCode: "NL"
// language: "Dutch" → Use languageCode: "nl"  
// currency: "Euro" → Use currencyCode: "EUR"
```

### Module Federation (Frontend)
```typescript
// Federated module configuration
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "ModuleName",
      filename: "remoteEntry.js",
      exposes: {
        "./ComponentName": "./src/components/ComponentName"
      },
      shared: ["react", "react-dom", "@briggsdesignsystem/components"]
    })
  ]
};
```

### Microservice Authentication
```csharp
// Extract user context from KrakenD headers
public class UserContextService
{
    public UserContext GetUserContext(HttpRequest request)
    {
        return new UserContext
        {
            UserId = request.Headers["x-sub"].FirstOrDefault(),
            Roles = request.Headers["x-user-roles"].FirstOrDefault()?.Split(','),
            Domain = request.Headers["x-user-domain"].FirstOrDefault()
        };
    }
}
```

---

## 🚨 **Critical Violations**

### Immediate Stop/Fix Required
- **JWT validation in services** - Only KrakenD should validate tokens
- **Personal data unencrypted** - All personal data must be encrypted across all system components
- **Missing 2FA** - All frontend applications require Keycloak MFA
- **Production data in test** - No production data in development/test environments

### High Priority Issues
- **Missing input validation** - Both client and server side required
- **Weak passwords** - Must meet Keycloak complexity requirements
- **Unlogged admin actions** - All administrative actions must be logged via briggslogging
- **Missing access controls** - Proper domain-based authorization implementation required

---

## 📋 **Assessment Decision Tree**

### Is Full ISO Assessment Required?

```
New Development or Fundamental Change?
├─ YES → Full ISO Assessment Required
│   └─ Use: iso-assessment-checklist.md
└─ NO → Minor Change
    ├─ Personal Data Involved?
    │   ├─ YES → Security Review Required
    │   └─ NO → Standard Review
    └─ External Integration?
        ├─ YES → Security Review Required
        └─ NO → Standard Review
```

### Quick Assessment Questions
1. **Does this change affect authentication?** → Check KrakenD pattern compliance
2. **Does this handle personal data?** → Verify encryption and logging
3. **Does this add new external access?** → Review access controls and monitoring
4. **Does this change data flows?** → Assess impact on existing security controls

---

## 🔗 **Quick Links**

### Documentation
- [`iso-assessment-checklist.md`](iso-assessment-checklist.md) - Complete assessment checklist
- [`iso-security-policy.md`](iso-security-policy.md) - Full security policy
- [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md) - Authentication architecture

### Code Review Integration
- [`../../.github/copilot-code-review-checklist.md`](../../.github/copilot-code-review-checklist.md) - Code review checklist
- Security findings automatically integrated with code review process

### Stack-Specific Guidance
- [`../stack/dotnet/`](../stack/dotnet/) - .NET security patterns
- [`../stack/react/`](../stack/react/) - Frontend security guidance
- [`../stack/krakend/`](../stack/krakend/) - Gateway configuration

---

## 📞 **Emergency Contacts**

### Security Incidents
1. **Functioneel Beheerder** - Primary security authority
2. **Cloud Infrastructure Provider** - Infrastructure and platform incidents
3. **Management Team** - Business-critical security issues

### Development Issues
1. **Internal Development Team** - All Briggs System component issues
2. **Cloud Provider Support** - Infrastructure and Kubernetes platform issues
3. **Functioneel Beheerder** - Policy and process questions

---

**Quick Reference Version**: 2.0  
**Last Updated**: June 2025  
**Architecture**: Briggs System - Microservices + Microfrontends  
**Always refer to full documentation for complete requirements**
