# Briggs System - AI Agent Quick Start

<!-- Keywords: AI, agent, copilot, assistant, authentication, JWT, security, KrakenD, microservice, stack, documentation -->

**ULTIMATE EFFICIENCY GUIDE**: Stack-specific documentation for maximum AI efficiency.

## 🔐 **CRITICAL: Authentication Architecture**

> **Before working with ANY authentication code, read**: [`authentication-architecture-principles.md`](authentication-architecture-principles.md)
>
> **KEY PRINCIPLE**: ONLY KrakenD validates JWT tokens. Individual services extract user context from headers.

## 🌍 **CRITICAL: ISO Data Format Standards**

> **🚨 MANDATORY for ALL APIs**: ISO standardized data formats REQUIRED
>
> **KEY STANDARDS**: 
> - **Countries**: ISO 3166-1 alpha-2 (e.g., "NL", "BE", "FR") 
> - **Languages**: ISO 639-1 (e.g., "en", "nl", "fr")
> - **Currencies**: ISO 4217 (e.g., "EUR", "USD", "GBP")
>
> **DOCUMENTATION**: [`api-development-standards.md`](api-development-standards.md)

## 🏛️ **POLICY SUPREMACY NOTICE**

> **🚨 CRITICAL**: `docs/policy/` documentation has **SUPREME AUTHORITY** over ALL other documentation.
>
> **When conflicts exist**: Policy always wins. See [`documentation-hierarchy.md`](documentation-hierarchy.md)

## 🛡️ **SECURITY: Policy & Compliance**

<!-- Keywords: policy, security policy, ISO assessment, security assessment, information security, ISO 27001, security checklist, compliance check, security controls, RFC security review, security requirements, vulnerability assessment -->

> **For all security assessments and compliance checks**: [`policy/README.md`](policy/README.md)
>
> **KEY TOOLS**: 
> - **Complete Assessment**: [`policy/iso-assessment-checklist.md`](policy/iso-assessment-checklist.md) - Point-by-point ISO compliance
> - **Quick Security Check**: [`policy/iso-quick-reference.md`](policy/iso-quick-reference.md) - Fast security validation
> - **RFC Security Review**: [`policy/iso-rfc-template.md`](policy/iso-rfc-template.md) - Change request security assessment

### When to Use Policy Documentation
- **Security reviews** → Use `policy/iso-assessment-checklist.md` point by point
- **RFC evaluation** → Use `policy/iso-rfc-template.md` for change security assessment  
- **Compliance audits** → Reference `policy/iso-controls-matrix.md` for complete mapping
- **Quick security check** → Use `policy/iso-quick-reference.md` for fast validation

## 🎯 Instant Stack Detection & Navigation

### Repository Type Detection
```
config.json present             → Service repository → Use stack/[detected-stack]/
frontend/ folder                → React module       → Use stack/react/
Controllers/ folder             → .NET API           → Use stack/dotnet/  
krakend.json present            → Gateway repository → Use stack/krakend/
package.json with federation    → React module       → Use stack/react/
android/ + ios/ + react-native  → React Native field app → Use stack/react/ (mobile shell; not Vite federation)
*.csproj files                  → .NET service       → Use stack/dotnet/
helm/ folder with Chart.yaml    → Infrastructure     → Use stack/helm/
auth-plugin/ folder             → KrakenD Gateway    → Use stack/krakend/
Dockerfile with clamav          → ClamAV service     → Use stack/clamav/
clamdscan usage                 → ClamAV service     → Use stack/clamav/
providers/ + themes/ folders    → Keycloak identity  → Use stack/keycloak/
pom.xml files (Java/Maven)      → Keycloak providers → Use stack/keycloak/
.storybook/ folder              → Storybook design   → Use stack/storybook/
stories files (*.stories.*)     → Storybook design   → Use stack/storybook/
CdcPollingFunction.cs or Cdc*.cs → CDC service        → Use stack/cdc/
TimerTrigger without Cdc*.cs    → .NET worker        → Use stack/dotnet/ (not CDC; e.g. pttn-address-projection)
plugin-deploy repository        → Shared deployment  → Use stack/helm/
artisan + composer.json (Laravel) → PHP apps (Koppelplatform integrator, DWH warehouse) → repository-overview.md (no stack/laravel folder)
```

## 📁 **Complete Stack Documentation**

**Stack Overview & Cross-References**: [`stack/README.md`](stack/README.md) - Comprehensive stack documentation index with authentication patterns

### Stack-Specific Quick Navigation
| **Stack** | **Quick Reference** | **Patterns** | **Troubleshooting** | **Architecture** |
|-----------|-------------------|--------------|-------------------|----------------|
| **React** | `stack/react/react-quick-reference.md` | `stack/react/react-patterns.md` | `stack/react/react-troubleshooting.md` | `react-module-architecture.md`<br/>`react-auth-architecture.md`<br/>`react-orchestrator-architecture.md` |
| **.NET** | `stack/dotnet/dotnet-quick-reference.md` | `stack/dotnet/dotnet-patterns.md` | `stack/dotnet/dotnet-troubleshooting.md` | `dotnet-architecture.md` (navigation hub)<br/>**Focused docs:** `dotnet-architecture-principles.md`, `dotnet-dependency-injection.md`, `dotnet-repository-patterns.md`, `dotnet-service-layer.md` |
| **KrakenD** | `stack/krakend/krakend-quick-reference.md` | `stack/krakend/krakend-patterns.md` | `stack/krakend/krakend-troubleshooting.md` | `krakend-architecture.md`<br/>**Advanced:** `krakend-auth-plugin-development.md`, `krakend-template-system.md`, `krakend-service-integration.md`, `krakend-performance-monitoring.md`, `krakend-dynamic-plugins.md` |
| **ClamAV** | `stack/clamav/clamav-quick-reference.md` | `stack/clamav/clamav-patterns.md` | `stack/clamav/clamav-troubleshooting.md` | `clamav-architecture.md` |
| **Keycloak** | `stack/keycloak/keycloak-quick-reference.md` | `stack/keycloak/keycloak-patterns.md` | `stack/keycloak/keycloak-troubleshooting.md` | `keycloak-architecture.md` |
| **Storybook** | `stack/storybook/storybook-quick-reference.md` | `stack/storybook/storybook-patterns.md` | `stack/storybook/storybook-troubleshooting.md` | `storybook-architecture.md` |
| **CDC** | `stack/cdc/cdc-quick-reference.md` | `stack/cdc/cdc-patterns.md` | `stack/cdc/cdc-troubleshooting.md` | `cdc-architecture.md` |
| **Helm** | `stack/helm/helm-quick-reference.md` | `stack/helm/helm-patterns.md` | `stack/helm/helm-troubleshooting.md` | `helm-architecture.md` |

### Cross-Stack Information
| **Topic** | **Location** | **When to Use** |
|-----------|--------------|-----------------|
| System Architecture | `application-architecture.md` | High-level system understanding |
| Domain Security | `domain-architecture.md` | Multi-tenant security patterns |
| Repository Overview | `repository-overview.md` | Understanding repo relationships |
| Database Schemas | `databases/` | Data modeling and query generation |

### Database Documentation
| **Database** | **Schema Documentation** | **Access Patterns** | **When to Use** |
|-------------|------------------------|-------------------|----------------|
| **📊 PTTN** | `databases/pttn-database-schema.md` | `databases/database-access-patterns.md` | **Core business data queries, 4-level authorization** |
| **⚙️ Briggsbase** | `databases/briggsbase-database-schema.md` | `databases/database-access-patterns.md` | **Gateway routing, plugin management** |
| **📈 Plugindb** | `databases/plugindb-database-schema.md` | `databases/database-access-patterns.md` | **Plugin data storage, analytics** |
| **🗄️ All DBs** | `databases/README.md` | `databases/database-access-patterns.md` | **Complete database index, quick reference** |

## 🗄️ Database Operations Quick Reference

### Common Database Tasks → Documentation
| **Task Type** | **Primary Documentation** | **Supporting Docs** |
|---------------|---------------------------|-------------------|
| **🔐 User Authorization** | `databases/pttn-database-schema.md` | `domain-architecture.md` |
| **🛣️ API Route Management** | `databases/briggsbase-database-schema.md` | `stack/krakend/` |
| **📊 Data Analytics** | `databases/plugindb-database-schema.md` | `databases/database-access-patterns.md` |
| **🔍 Query Performance** | `databases/database-access-patterns.md` | All schema docs |
| **🏢 Multi-Tenant Security** | `databases/pttn-database-schema.md` | `domain-architecture.md` |
| **🔌 Plugin Data Storage** | `databases/plugindb-database-schema.md` | `databases/database-access-patterns.md` |

### Database Keywords for AI Search:
- **domain filtering, authorization, security** → PTTN schema documentation
- **gateway routes, plugin config, KrakenD** → BriggsBase schema documentation  
- **analytics, processing, logging** → PluginDB schema documentation
- **performance, indexes, caching** → Access patterns documentation

## 🧭 Cursor integration

Briggs-wide Cursor rules and skills are distributed by the
[`cursor-plugin`](https://github.com/Briggs-Walker/cursor-plugin) repository.
Install that plugin instead of copying `.cursor/` files into each service.

This repository remains the canonical source for policy, architecture, stack,
and database detail. Project `.cursor/` folders are reserved for repository-local
exceptions. See [`cursor-plugin-integration.md`](cursor-plugin-integration.md).
For Cloud Agents and team secrets, see
[`cursor-cloud-agent-briefing.md`](cursor-cloud-agent-briefing.md).

## ⚡ AI Efficiency Rules

1. **Detect stack first** using repository structure
2. **Use stack-specific docs** for 90% of questions
3. **Reference cross-stack docs** only for architecture/security
4. **Never mix stack content** in responses

## 🎯 AI Response Quality Guidelines

### Code Examples
- **Always include complete, runnable examples** with proper context
- **Provide error handling and validation** in code samples
- **Include package references** and dependencies when relevant

### Error Context & Troubleshooting
- **Ask for specific details**: error messages, logs, environment details
- **Provide step-by-step debugging** approaches
- **Reference stack-specific troubleshooting docs** (e.g., "Per dotnet-troubleshooting.md...")

### Stack Consistency
- **Never mix patterns** from different stacks in a single response
- **Always reference specific docs used** (e.g., "Based on react-patterns.md...")
- **Keep responses focused** on the detected stack

### Implementation Order
- **Provide numbered steps** with verification commands for multi-step solutions
- **Include testing and validation** steps
- **Provide rollback procedures** when appropriate

**EFFICIENCY RULE**: Use stack-specific docs first. They contain 90% of what you need with minimal token usage.

## 🔧 Common Pattern Quick Reference

| **Pattern Type** | **Documentation** | **Description** |
|------------------|-------------------|-----------------|
| **React Module Setup** | `react-module-architecture.md` | Module federation configuration |
| **API Authentication** | `authentication-architecture-principles.md` | Header-based identity (`x-sub`); only KrakenD validates JWT |
| **Gateway Configuration** | `krakend-patterns.md` | Route and middleware setup |
| **Error Handling** | `[stack]-troubleshooting.md` | Stack-specific debugging steps |
| **Deployment** | `helm-patterns.md` | Kubernetes deployment patterns |
| **Database Queries** | `databases/database-access-patterns.md` | Domain-aware query patterns |
| **Authorization** | `databases/pttn-database-schema.md` | 4-level security model |
| **Plugin Management** | `databases/briggsbase-database-schema.md` | Route/plugin config |

## 🔧 Context Helpers (Shared)

### Core Ports
- Frontend: 3000 (prod) / 5173 (dev)  
- Backend: 8080
- Gateway: 8080
- Auth: 8080

### Non-Negotiable Rules
1. **Domain Isolation**: All code must respect multi-tenant boundaries
2. **Gateway Routing**: All services communicate through KrakenD gateway  
3. **Database Pattern**: Direct reads OK, writes through Rulesengine API
4. **Authentication**: Keycloak required for all user-facing services

## 🚀 Decision Tree

```
Simple request (single file, basic question)?
  ↓
Use minimal copilot-instructions.md
  ↓
Detect repository type
  ↓
Use stack/[type]/[type]-[topic].md

Complex request (architecture, multi-file, database)?
  ↓
Use copilot-instructions-comprehensive.md
  ↓
Follow 4-step decision tree
  ↓
Use stack/[type]/[type]-[topic].md + cross-stack docs
```

**Benefits:**
- **90% token reduction** for stack-specific questions
- **Instant relevance** - no mixed content
- **Faster responses** - smaller, focused files
- **Better maintenance** - teams own their stack docs
- **Scalable complexity** - minimal for simple, comprehensive for complex

**For Complex Requests**: See `.github/copilot-instructions-comprehensive.md` for advanced decision trees and detailed guidance.
