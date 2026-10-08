# Authentication Architecture Principles - Briggs System

<!-- Keywords for AI discovery: authentication, JWT, token, validation, security, KrakenD, gateway, microservice, authorize, login, auth, bearer, claims, headers -->

## 🔐 CRITICAL ARCHITECTURE PRINCIPLE

**ONLY KrakenD Gateway validates JWT tokens**. Individual microservices should NOT implement JWT validation.

## Correct Authentication Flow

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend   │───▶│  KrakenD Gateway │───▶│  Microservice   │
│             │    │                 │    │                 │
│ JWT Token   │    │ ✅ JWT Validation│    │ ❌ NO JWT       │
│             │    │ ✅ Claims Extract│    │ ✅ Header Context│
└─────────────┘    └─────────────────┘    └─────────────────┘
```

## ✅ CORRECT Implementation

### KrakenD Configuration
```json
{
  "auth/validator": {
    "alg": "RS256",
    "jwk_url": "https://keycloak.com/realms/briggs/protocol/openid_connect/certs",
    "propagate_claims": [
      ["sub", "x-sub"],
      ["realm_access.roles", "x-user-roles"],
      ["domain", "x-user-domain"]
    ]
  }
}
```

`auth/validator` remains the only JWT signature check. Plugin routes that use `ProjectsDomains` also receive `x-auth-projects` (domain + project grants from the KrakenD auth plugin). Consume that header for plugin authorization **in addition to** claim headers. Do not omit `domain` → `x-user-domain` from `propagate_claims`, and do not validate JWTs inside the plugin or the service.

### .NET Microservice Implementation
```csharp
// ✅ CORRECT - Extract user context from KrakenD headers
public abstract class BaseController : ControllerBase
{
    protected string GetUserId()
    {
        return Request.Headers["x-sub"].FirstOrDefault() 
            ?? throw new UnauthorizedAccessException("User context missing");
    }
    
    protected string[] GetUserRoles()
    {
        var rolesHeader = Request.Headers["x-user-roles"].FirstOrDefault();
        return rolesHeader?.Split(',') ?? Array.Empty<string>();
    }
}

[ApiController]
public class ProjectsController : BaseController
{
    [HttpGet]
    public async Task<IActionResult> GetProjects()
    {
        var userId = GetUserId(); // ✅ From KrakenD headers
        // Business logic with authenticated context
        return Ok(projects);
    }
}
```

## ❌ INCORRECT Implementation

### What NOT to do in .NET Services
```csharp
// ❌ WRONG - Do NOT implement JWT validation in services
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://keycloak.com/realms/briggs";
        options.Audience = "service-audience";
    });

// ❌ WRONG - Do NOT add authentication middleware
app.UseAuthentication();
app.UseAuthorization();

// ❌ WRONG - Do NOT access JWT claims directly
var user = HttpContext.User;
var userId = user.FindFirst("sub")?.Value;
```

## Architecture Benefits

1. **Single Point of Authentication**: Only KrakenD validates tokens
2. **Simplified Services**: Backend services focus on business logic
3. **Consistent Security**: Centralized authentication policy
4. **Performance**: No duplicate JWT validation across services
5. **Maintainability**: Authentication changes only affect KrakenD

## Common Mistakes to Avoid

### ❌ Individual Service Authentication
- Adding `AddAuthentication()` to .NET services
- Implementing JWT Bearer middleware in services
- Validating JWT tokens in multiple places
- Direct Keycloak integration in backend services

### ❌ Mixed Authentication Patterns
- Some services validating JWT, others using headers
- Inconsistent user context extraction
- Multiple authentication mechanisms

### ❌ Missing User Context
- Not extracting user information from KrakenD headers
- Ignoring domain/tenant context
- Missing authorization checks

## Compliance Checklist

When reviewing code, ensure:

- [ ] **NO** `AddAuthentication()` or `AddJwtBearer()` in .NET services
- [ ] **NO** `app.UseAuthentication()` middleware in services
- [ ] **NO** direct JWT token validation in services
- [ ] **YES** user context extraction from headers (`x-sub`, etc.)
- [ ] **YES** domain-based authorization using header context
- [ ] **YES** KrakenD configured with proper claims propagation

## Reference Documentation

- [`stack/krakend/krakend-architecture.md`](stack/krakend/krakend-architecture.md) - Gateway authentication setup
- [`stack/dotnet/dotnet-patterns.md`](stack/dotnet/dotnet-patterns.md) - Service user context patterns
- [`stack/keycloak/keycloak-architecture.md`](stack/keycloak/keycloak-architecture.md) - Identity provider integration

---

**Remember**: KrakenD is the ONLY component that should validate JWT tokens. All other services receive pre-authenticated requests with user context in headers.
