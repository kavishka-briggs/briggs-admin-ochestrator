# Copilot Code Review Quick Reference

## Trigger Phrases
When user says any of these, execute the code review checklist:
- "perform a code review"
- "review this code for compliance"
- "check documentation compliance"
- "assess repository compliance"
- "do a comprehensive code review"

## Immediate Response Template
```
I'll perform a comprehensive code review following our established checklist to assess repository compliance with available documentation standards. This will be conducted in read-only mode without making any file changes.

Let me start by discovering the repository structure and available documentation...
```

## Quick Execution Steps
1. **Documentation discovery** - Find and catalog all available docs
2. **Stack detection** - Identify technologies and patterns
3. **Standards assessment** - Compare code against discovered documentation
4. **Generate adaptive report** - Use standardized format with discovered content
5. **End with read-only confirmation**

## Critical Reminders
- ❌ **NEVER MODIFY FILES** during code review
- ✅ **ALWAYS use the standardized output format**
- ✅ **Reference specific line numbers and files**
- ✅ **Cross-reference with `/docs/` folder**
- ✅ **Provide actionable recommendations**

## 🚨 CRITICAL Architecture Violations

### Authentication Architecture (FLAG IMMEDIATELY)
❌ **NEVER ALLOW**: Individual services implementing JWT validation
- `AddAuthentication()`, `AddJwtBearer()` in .NET services
- `app.UseAuthentication()` middleware in services
- `HttpContext.User` JWT access in services

✅ **MUST HAVE**: KrakenD-only authentication
- Services extract user context from headers: `Request.Headers["x-sub"]`
- KrakenD configured with `propagate_claims`
- No JWT validation in individual services

**Reference**: `authentication-architecture-principles.md`

## Documentation Mapping Reference
| File Pattern | Documentation Path |
|--------------|-------------------|
| `*.csproj` | `stack/dotnet/dotnet-[topic].md` |
| `package.json` + federation | `stack/react/react-[topic].md` |
| `krakend.json` | `stack/krakend/krakend-[topic].md` |
| `helm/Chart.yaml` | `stack/helm/helm-[topic].md` |
| `Controllers/` | `stack/dotnet/` |
| `frontend/` | `stack/react/` |
| `CdcPollingFunction.cs` | `stack/cdc/` |
| `.storybook/` | `stack/storybook/` |
| `providers/` + `themes/` | `stack/keycloak/` |
| `Dockerfile` with clamav | `stack/clamav/` |

## Compliance Checkpoints
- **Documentation-Driven**: Assess against discovered documentation, not predetermined requirements
- **Architecture**: Whatever architectural principles are documented in the repository
- **Standards**: Whatever coding/configuration standards are documented
- **Security**: Whatever security guidelines are documented
- **Organization**: Whatever file structure patterns are documented
- **Database**: Whatever database patterns/schemas are documented

## Discovery Priority
1. **Repository documentation structure** (`/docs/`, `README.md`, etc.)
2. **Architecture documentation** (system design, principles)
3. **Stack-specific documentation** (technology guidelines)
4. **Database documentation** (schemas, access patterns)
5. **Configuration standards** (deployment, environment setup)
6. **Security guidelines** (authentication, data handling)
