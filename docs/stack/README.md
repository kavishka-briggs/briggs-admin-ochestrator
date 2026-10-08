# Briggs System - Stack Documentation

## 🏛️ **POLICY SUPREMACY NOTICE**

> **🚨 CRITICAL**: All stack documentation must comply with [`../policy/`](../policy/) requirements.
>
> **Policy wins ALL conflicts**. See [`../documentation-hierarchy.md`](../documentation-hierarchy.md)

## 🔐 **CRITICAL: Authentication Architecture**

> **BEFORE implementing authentication in ANY stack**: [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md)
>
> **ONLY KrakenD validates JWT tokens**. All other services receive pre-authenticated requests with user context in headers.

## Stack-Specific Documentation

### Backend & API Services
- **[.NET Stack](dotnet/)** - ASP.NET Core APIs, controllers, and business logic
- **[KrakenD Gateway](krakend/)** - API Gateway configuration, routing, and security
  - **📚 Comprehensive Implementation Guides**: Auth plugin development, template systems, service integration, performance monitoring, and dynamic plugin discovery
- **[Keycloak Identity](keycloak/)** - Identity provider configuration and custom extensions
- **[CDC Services](cdc/)** - Change Data Capture and data synchronization

### Frontend & UI
- **[React Stack](react/)** - React microfrontends, module federation, and authentication
- **[Storybook](storybook/)** - Component library and design system documentation

### Infrastructure & Deployment
- **[Helm Charts](helm/)** - Kubernetes deployment configurations
- **[ClamAV Security](clamav/)** - Anti-virus scanning service integration

## Quick Architecture Reference

### Authentication Flow
```
Frontend → KrakenD (JWT Validation) → Microservice (Header Context)
```

### Service Communication
```
React Module → Orchestrator → KrakenD Gateway → .NET API → Database
```

### Key Principles
- **Domain Isolation**: Multi-tenant data separation
- **Gateway-First**: All requests flow through KrakenD
- **Header-Based Auth**: Services extract user context from headers
- **Plugin Architecture**: Dynamic functionality via briggsbase

## Stack Integration Patterns

| Pattern | Description | Documentation |
|---------|-------------|---------------|
| **Authentication** | KrakenD-only JWT validation | [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md) |
| **Authorization** | Domain-based access control | [`../domain-architecture.md`](../domain-architecture.md) |
| **Data Access** | 4-level hierarchy patterns | [`../databases/database-access-patterns.md`](../databases/database-access-patterns.md) |
| **Module Federation** | React microfrontend sharing | [`react/react-module-architecture.md`](react/react-module-architecture.md) |
| **Gateway Routing** | Dynamic route configuration | [`krakend/krakend-architecture.md`](krakend/krakend-architecture.md) |

## Common Cross-Stack Issues

### Authentication Violations (CRITICAL)
❌ **Never implement JWT validation in individual services**
- No `AddAuthentication()` in .NET services
- No JWT middleware in services
- No direct Keycloak integration in services

✅ **Correct authentication patterns**
- Extract user context from KrakenD headers
- Use `Request.Headers["x-sub"]` for user ID
- Implement domain-based authorization

### Service Communication
- All inter-service communication flows through KrakenD
- Use service discovery for internal routing
- Implement proper error handling and retry logic

### Configuration Management
- Use environment-specific configuration files
- Implement proper secrets management
- Follow stack-specific configuration patterns

---

**For detailed implementation guides, see the stack-specific folders above.**
