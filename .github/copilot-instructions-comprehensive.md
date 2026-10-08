# Copilot Instructions - Comprehensive

**For Complex Architectural and Cross-Stack Operations**

## Stack-Specific References - Complete Map:

### React Stack
- **Quick Reference**: `stack/react/react-quick-reference.md`
- **Patterns**: `stack/react/react-patterns.md`
- **Troubleshooting**: `stack/react/react-troubleshooting.md`
- **Architecture**: `react-module-architecture.md`, `react-auth-architecture.md`, `react-orchestrator-architecture.md`

### .NET Stack
- **Quick Reference**: `stack/dotnet/dotnet-quick-reference.md`
- **Patterns**: `stack/dotnet/dotnet-patterns.md`
- **Troubleshooting**: `stack/dotnet/dotnet-troubleshooting.md`
- **Architecture Hub**: `dotnet-architecture.md`
- **Focused Docs**: `dotnet-architecture-principles.md`, `dotnet-dependency-injection.md`, `dotnet-repository-patterns.md`, `dotnet-service-layer.md`

### KrakenD Stack
- **Quick Reference**: `stack/krakend/krakend-quick-reference.md`
- **Patterns**: `stack/krakend/krakend-patterns.md`
- **Troubleshooting**: `stack/krakend/krakend-troubleshooting.md`
- **Architecture**: `krakend-architecture.md`

### ClamAV Stack
- **Quick Reference**: `stack/clamav/clamav-quick-reference.md`
- **Patterns**: `stack/clamav/clamav-patterns.md`
- **Troubleshooting**: `stack/clamav/clamav-troubleshooting.md`
- **Architecture**: `clamav-architecture.md`

### Keycloak Stack
- **Quick Reference**: `stack/keycloak/keycloak-quick-reference.md`
- **Patterns**: `stack/keycloak/keycloak-patterns.md`
- **Troubleshooting**: `stack/keycloak/keycloak-troubleshooting.md`
- **Architecture**: `keycloak-architecture.md`

### Storybook Stack
- **Quick Reference**: `stack/storybook/storybook-quick-reference.md`
- **Patterns**: `stack/storybook/storybook-patterns.md`
- **Troubleshooting**: `stack/storybook/storybook-troubleshooting.md`
- **Architecture**: `storybook-architecture.md`

### CDC Stack
- **Quick Reference**: `stack/cdc/cdc-quick-reference.md`
- **Patterns**: `stack/cdc/cdc-patterns.md`
- **Troubleshooting**: `stack/cdc/cdc-troubleshooting.md`
- **Architecture**: `cdc-architecture.md`

### Helm Stack
- **Quick Reference**: `stack/helm/helm-quick-reference.md`
- **Patterns**: `stack/helm/helm-patterns.md`
- **Troubleshooting**: `stack/helm/helm-troubleshooting.md`
- **Architecture**: `helm-architecture.md`

## 4-Step Decision Tree (Complex Operations)

**Step 1: Advanced Stack Detection**
- `config.json` present → Service → Use `stack/[detected-stack]/`
- `frontend/` folder → React → Use `stack/react/`
- `Controllers/` folder → .NET → Use `stack/dotnet/`
- `krakend.json` → Gateway → Use `stack/krakend/`
- `*.csproj` files → .NET service → Use `stack/dotnet/`
- `package.json` with federation → React module → Use `stack/react/`
- `helm/` folder with Chart.yaml → Infrastructure → Use `stack/helm/`
- `auth-plugin/` folder → KrakenD Gateway → Use `stack/krakend/`
- `Dockerfile` with clamav → ClamAV service → Use `stack/clamav/`
- `providers/` + `themes/` folders → Keycloak identity → Use `stack/keycloak/`
- `.storybook/` folder → Storybook design → Use `stack/storybook/`
- `CdcPollingFunction.cs` present → CDC service → Use `stack/cdc/`

**Step 2: Use Stack-Specific Docs**
- **React Issue?** → `stack/react/react-[topic].md`
  - **Architecture?** → `react-module-architecture.md`, `react-auth-architecture.md`, `react-orchestrator-architecture.md`
- **.NET Issue?** → `stack/dotnet/dotnet-[topic].md`
  - **Architecture?** → `dotnet-architecture.md`
  - **🚨 CRITICAL**: Check `docs/api-development-standards.md` for MANDATORY ISO data format requirements
- **Gateway Issue?** → `stack/krakend/krakend-[topic].md`
  - **Architecture?** → `krakend-architecture.md`
- **ClamAV Issue?** → `stack/clamav/clamav-[topic].md`
  - **Architecture?** → `clamav-architecture.md`
- **Keycloak Issue?** → `stack/keycloak/keycloak-[topic].md`
  - **Architecture?** → `keycloak-architecture.md`
- **Storybook Issue?** → `stack/storybook/storybook-[topic].md`
  - **Architecture?** → `storybook-architecture.md`
- **CDC Issue?** → `stack/cdc/cdc-[topic].md`
  - **Architecture?** → `cdc-architecture.md`
- **Infrastructure Issue?** → `stack/helm/helm-[topic].md`
  - **Architecture?** → `helm-architecture.md`

**Step 3: Database & Data Operations** 🗄️
- **Any database query?** → `databases/database-access-patterns.md` + specific schema
- **PTTN business data?** → `databases/pttn-database-schema.md` (4-level authorization)
- **Gateway/plugin config?** → `databases/briggsbase-database-schema.md` (routes/plugins)
- **Plugin data storage?** → `databases/plugindb-database-schema.md` (analytics/processing)
- **Security/authorization?** → `databases/pttn-database-schema.md` + `domain-architecture.md`

**Step 4: Cross-Stack Architecture** - Only when needed:
- Architecture questions → `application-architecture.md`
- Security/domain questions → `domain-architecture.md`
- Database/data questions → `databases/` folder

## Advanced Context Helpers

### Authentication Details
- **Keycloak-based**: domain-scoped access required
- **Module Federation**: React modules use standardized patterns
- **API Access**: All services communicate through KrakenD gateway
- **Database Pattern**: Direct reads OK, writes through Rulesengine API

### Use Case → Database Documentation Mapping
- **🔐 User authorization/permissions** → `databases/pttn-database-schema.md` (4-level model)
- **🛣️ API routing/gateway config** → `databases/briggsbase-database-schema.md` (plugin routes)
- **📊 Plugin data/analytics** → `databases/plugindb-database-schema.md` (domain isolation)
- **🔍 Query patterns/performance** → `databases/database-access-patterns.md` (all databases)
- **🏢 Multi-tenant security** → `databases/pttn-database-schema.md` + `domain-architecture.md`

### Database Keywords for AI Detection
- **Domain filtering, authorization, multi-tenant** → PTTN database docs
- **Plugin routes, gateway config, KrakenD** → BriggsBase database docs  
- **Analytics, logging, processing** → PluginDB database docs
- **Query optimization, indexes, performance** → Access patterns docs

## AI Response Quality Guidelines

### Code Examples
- Always include complete, runnable examples
- Provide context and explain patterns
- Include error handling and validation

### Error Context
- When troubleshooting, ask for error messages, logs, and environment details
- Provide step-by-step debugging approaches
- Reference specific troubleshooting docs

### Stack Consistency
- Never mix patterns from different stacks in a single response
- Always reference the specific docs used (e.g., "Per react-patterns.md...")
- Keep responses focused on the detected stack

### Implementation Order
- For multi-step solutions, provide numbered steps with verification commands
- Include testing and validation steps
- Provide rollback procedures when appropriate

## Common Pattern Quick Reference

- **React Module Setup**: `react-module-architecture.md` → Module federation configuration
- **API Authentication**: `dotnet-patterns.md` → JWT token validation setup
- **Gateway Configuration**: `krakend-patterns.md` → Route and middleware setup
- **Error Handling**: `[stack]-troubleshooting.md` → Stack-specific debugging steps
- **Deployment**: `helm-patterns.md` → Kubernetes deployment patterns
- **Database Queries**: `databases/database-access-patterns.md` → Domain-aware query patterns
- **Authorization**: `databases/pttn-database-schema.md` → 4-level security model
- **Plugin Management**: `databases/briggsbase-database-schema.md` → Route/plugin config
- **🚨 ISO Data Standards**: `docs/api-development-standards.md` → MANDATORY ISO 3166-1 alpha-2 (countries), ISO 639-1 (languages), ISO 4217 (currencies)

**EFFICIENCY RULE**: Use stack-specific docs first. They contain 90% of what you need with minimal token usage.
