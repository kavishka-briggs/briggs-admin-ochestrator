# Briggs System - Repository Overview

**AI Navigation Quick Start:**
- **New Repository?** → See [Repository Lifecycle](#repository-lifecycle) section
- **Understanding Architecture?** → See [Repository Categories](#repository-categories) and [Repository Inventory](#repository-inventory)  
- **Finding Dependencies?** → Use repository metadata in inventory section
- **Development Standards?** → See [Development Guidelines](#development-guidelines)

This document provides a structured overview of all repositories in the Briggs System ecosystem. It's designed to help AI agents, developers, and stakeholders understand the purpose, relationships, and technical details of each repository.

## Repository Categories

### Core Infrastructure
Foundational services that support the entire system.

### Shared Infrastructure
Common deployment templates, configurations, and infrastructure components used across all services.

### Design System & Libraries
Shared UI components, design tokens, and development libraries used across applications.

### System Components
Specialized components for security, monitoring, and system operations.

### Logging Services
Centralized logging and audit trail services for the Briggs System.

### PTTN Microservices
Backend API services that directly interact with the PTTN system.

### Kickstarter Modules
Modules that provide essential functionality that is enabled by default for new customers.

### Modules
Extended functionality modules that can be enabled per domain.

**Note**: Microfrontend modules (React-based frontend modules using module federation) are distributed across multiple categories:
- **Core Infrastructure**: `briggs-orchestrator`, `briggs-orchestrator-mobile`, `briggs-modules-authentication` (catalog alias: `module-authenticator`)
- **Kickstarter Modules**: `module-onboarding`, `module-projectwizard`, `module-dashboardbasic` (GitHub: `modules-dashboardbasic`), `module-projectbasic`, `modules-crewbasic` (plugin_id `module-crewbasic`)
- **Modules**: `modules-quartercompletion` (monorepo; plugin_id `module-quartercompletion`)

---

## Repository Inventory

### Core Infrastructure

#### `briggsbase`
- **Type**: System Configuration Service
- **Technology**: .NET 9 + Entity Framework + SQL Server
- **Purpose**: Central system configuration and module registry service
- **Dependencies**: Briggsbase Database, Keycloak (auth), PTTN Database, PTTN Onboarding API
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet-architecture.md`
- **Key Features**:
  - Plugin/module registration and discovery
  - Dynamic route management for API Gateway
  - Domain and organization management
  - Plugin activation control per domain
  - User profile management
  - Database migrations with Entity Framework
  - Integration with Keycloak for authentication
  - Multi-tenant domain isolation

#### `briggs-gateway-api` (KrakenD)
- **Type**: API Gateway
- **Technology**: KrakenD + Custom Go Auth Plugin
- **Purpose**: Central API gateway for routing, authentication, and load balancing
- **Dependencies**: All microservices, Keycloak, briggsbase (route discovery)
- **Deployment**: Kubernetes via Helm charts (values-dev.yaml, values-eu.yaml)
- **Documentation**: `docs/stack/krakend/krakend-architecture.md`
- **Key Features**:
  - Template-driven configuration with Go templates
  - Custom Go authentication plugin for complex auth logic
  - Dynamic plugin route discovery from briggsbase API
  - JWT authentication and authorization via Keycloak
  - Rate limiting and traffic management
  - Prometheus metrics and OpenTelemetry integration
  - Multi-environment deployment (dev, eu)
  - CORS configuration for microfrontend support

#### `briggs-orchestrator`
- **Type**: Microfrontend Shell
- **Technology**: React + Vite + Module Federation
- **Purpose**: Main application shell that hosts and coordinates all microfrontends
- **Dependencies**: All microfrontend modules, Keycloak, Gateway API
- **Deployment**: Custom deployment workflow
- **Documentation**: `docs/stack/react/react-orchestrator-architecture.md`
- **Key Features**:
  - Dynamic module loading and federation
  - Centralized authentication management
  - Adaptive routing and navigation
  - State management with Zustand

#### `briggs-orchestrator-mobile`
- **Type**: Field mobile application (not a Module Federation shell)
- **Technology**: React Native + Expo (web target uses Webpack / `react-native-web`)
- **Purpose**: Offline-capable field fundraising client; obtains Keycloak JWT in-app and calls APIs through the gateway
- **Dependencies**: Keycloak, Gateway API, PTTN crew/forms/address APIs via KrakenD
- **Deployment**: Expo / native stores (not the Vite orchestrator pipeline)
- **Documentation**: `docs/stack/react/react-quick-reference.md` (gateway + Keycloak client pattern; no Vite federation tree)
- **Key Features**:
  - Direct OIDC PKCE (`react-native-app-auth`) rather than federated `briggs-modules-authentication` or `keycloak-js`
  - Bearer token to gateway; no client JWT signature validation
  - Per-region gateway and Keycloak endpoints
  - Domain-scoped crew/shift context
  - Zustand + AsyncStorage

#### `auth` (Keycloak)
- **Type**: Identity Provider
- **Technology**: Keycloak + Java/Maven (custom providers)
- **Purpose**: Authentication and authorization service with custom extensions
- **Dependencies**: None (standalone) + SMTP for email 2FA
- **Deployment**: Custom deployment workflow with Docker + Kubernetes
- **Key Features**:
  - Single sign-on (SSO)
  - User management and roles
  - OAuth 2.0 / OpenID Connect
  - Multi-tenant support
  - Custom Briggs theme (briggstheme)
  - Custom Providers:
    - **Briggs Event Listener**: Tracks user login dates and updates user attributes
    - **Briggs Hybrid Authentication**: Pepperminds API integration for prefix-based user validation
    - **Keycloak 2FA Email**: Email-based two-factor authentication with OTP

#### `briggs-modules-authentication` (frontend; formerly catalogued as `module-authenticator`)
- **Type**: Microfrontend Module
- **Technology**: React + TypeScript + Vite + Module Federation + Keycloak
- **Purpose**: Central authentication module providing Keycloak integration and organization validation
- **GitHub**: `Briggs-Walker/briggs-modules-authentication`
- **Dependencies**: Keycloak (auth), Gateway API, briggsdesignsystem
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/react/react-auth-architecture.md`
- **Key Features**:
  - Keycloak SSO integration with automatic token refresh
  - Multi-step authentication flow with organization validation
  - Dynamic runtime configuration loading
  - Module federation exports for orchestrator consumption
  - Comprehensive authentication event tracking
  - Organization access control and domain validation
  - Progressive authentication with fallback handling
  - Multi-language support and responsive design

### Shared Infrastructure

#### `plugin-deploy`
- **Type**: Shared Deployment Templates
- **GitHub**: `Briggs-Walker/plugin-deploy`
- **Technology**: Helm 3 application charts (`backend-plugin` / `frontend-plugin` version `1.0.0`) plus reusable GitHub Actions
- **Purpose**: Standardized Helm charts and workflows for backend APIs and frontend microfrontends
- **Dependencies**: Kubernetes cluster, Helm 3.x, Azure Container Registry (images set at install)
- **Deployment**: N/A (consumed by other repositories). Also ships `koppelplatform-deploy.yaml`, Keycloak/KrakenD/DWH/mobile workflows, local `docker-compose/`, `grafana/`, and `helm/sonarqube/values-prod.yaml`
- **Documentation**: `docs/stack/helm/helm-architecture.md`
- **Key Features**:
  - Backend chart: ClusterIP default port 8080; `backend.splitSecrets`; optional CPU/memory **requests** only; **no** liveness/readiness probes in the template
  - Frontend chart: ClusterIP default port 3000; nginx Ingress (`orchestratordomain`, TLS); helper still named `backend.splitSecrets`
  - Value files: `values-dev.yaml` (`resources.enabled: false`), `values-eu.yaml` and `values-au.yaml` (`resources.enabled: true`, `replicas: 1`)
  - Reusable workflows include `backend-deploy-au.yaml` / `frontend-deploy-au.yaml` in addition to dev and eu
  - Charts do not validate JWTs; identity remains KrakenD-only

### Design System & Libraries

#### `briggsdesignsystem`
- **Type**: Design System Library
- **Technology**: React + Storybook + TypeScript + Tailwind CSS
- **Purpose**: Shared UI components, design tokens, and visual documentation
- **Dependencies**: None (standalone library)
- **Deployment**: Custom Storybook deployment workflow + NPM package publishing
- **Documentation**: `docs/stack/storybook/`
- **Key Features**:
  - Comprehensive React component library
  - Design tokens and theming system
  - Interactive Storybook documentation
  - Tailwind CSS integration
  - TypeScript support
  - Accessibility compliance (WCAG)
  - Rollup-based build system
  - Docker containerization for Storybook hosting

### System Components

#### `clamav-api`
- **Type**: Security Service (Antivirus)
- **Technology**: .NET 10 + ClamAV Engine (`clamav/clamav-debian:1.4`) + Docker
- **Purpose**: File scanning and malware detection for uploaded content
- **Dependencies**: None (standalone scanner). Callers such as `file-upload-api` supply a basename under the mounted share. This service does not validate JWTs (KrakenD-only) and has no tenant data model
- **Deployment**: Custom in-repo Helm chart (`helm/values-dev.yaml`, `helm/values-eu.yaml`), namespace `clamav`, ClusterIP port 80 → container 8080. Not `plugin-deploy` `helm/backend`
- **Documentation**: `docs/stack/clamav/clamav-architecture.md`
- **Key Features**:
  - REST API for file scanning (`POST /scan?fileName=`)
  - ClamAV antivirus engine integration via `clamdscan`
  - Multi-stage image: `mcr.microsoft.com/dotnet/sdk:10.0` → `clamav/clamav-debian:1.4`; API dropped to user `clamav` with `setpriv`
  - File share mount at `FILE_SHARE_MOUNT_PATH` (default `/files`); **required read-only** — current Helm/compose mounts are writable (**code violates contract**, do not weaken)
  - Health: `/health/live` (process) and `/health/ready` (share + clamd socket)
  - Automatic virus definition updates (`freshclam` in `docker-entrypoint.sh`)
  - Helm resources 300m/1800Mi request, 1200m/3600Mi limit; HPA 2–5; PDB `minAvailable: 1`

#### `cdc-pttn`
- **Type**: Data Integration Service
- **GitHub**: `Briggs-Walker/cdc-pttn` (default branch `main`)
- **Technology**: .NET 9 (`net9.0`) + Azure Functions v4 isolated worker + SQL Server CDC + Azure Service Bus
- **Purpose**: Poll PTTN CDC change tables and publish events to Service Bus
- **Dependencies**: PTTN SQL Server (CDC enabled), Azure Service Bus. No Keycloak/JWT; no KrakenD (timer poller, not an HTTP API)
- **Deployment**: Azure Functions (`azure/functions-action` in `.github/workflows/deploy_dev.yaml` and `deploy_eu.yaml`). No Helm chart or KEDA ScaledObject in the repository
- **Documentation**: `docs/stack/cdc/cdc-architecture.md`
- **Key Features**:
  - Timer trigger `*/10 * * * * *` (`CdcPollingFunction`)
  - Reads `cdc.pttn_TOPIC_EVENT_CT` (`__$start_lsn`, `topic`, `payload`) in LSN order
  - Publishes each payload to the Service Bus topic named in the row `topic` column
  - Operational LSN watermark in `dbo.cdc_offset_tracker` (single `last_lsn binary(10)` row)
  - Offset is updated only after a successful publish batch (at-least-once; consumers must be idempotent)
  - Env: `SQL_CONNECTION_STRING`, `SERVICE_BUS_CONNECTION_STRING`
  - `host.json` timers `maxConcurrentFunctions: 1`
  - Does **not** write business PTTN rows and does **not** call Rulesengine; capturing CDC plus a watermark is not an application PTTN write
  - No service-side JWT validation

#### `cdc-agencysuite`
- **Type**: Data Integration Service (AgencySuite source, not PTTN)
- **GitHub**: `Briggs-Walker/cdc-agencysuite` (default branch `development`)
- **Technology**: .NET 10 (`net10.0`, SDK `10.0.400`) + Azure Functions v4 isolated worker + EF Core 10 + SQL Server CDC + Azure Service Bus
- **Purpose**: Poll AgencySuite CDC captures for controlled sales orders and own-employee contacts, then publish to Service Bus
- **Dependencies**: AgencySuite SQL Server, Azure Service Bus (queue + topics). Azure uses `ServiceBus__FullyQualifiedNamespace` with managed identity; local uses a connection string. No Keycloak/JWT; no KrakenD
- **Deployment**: Azure Functions (`cdc-agencysuite-dev`; `cdc-agencysuite-prod` Flex Consumption). `config.json` `deployment_mode: container` is plugin metadata; CI uses `azure/functions-action`. `docker-compose.yml` is local only. No Helm chart or KEDA ScaledObject
- **Documentation**: `docs/stack/cdc/cdc-architecture.md`
- **Key Features**:
  - Timer trigger `%CdcPollCron%` (Azure app setting default `0 */1 * * * *`)
  - Captures: `agencysuite_SALES_ORDER`, `agencysuite_CONTACT`, `agencysuite_CONTACT_ROLE`
  - Sales orders publish to Service Bus **queue** `sales-orders` (not a topic)
  - Employee events publish to topics; Azure app settings use `employee_new` / `employee_change`, while local `appsettings.Development.json` and the emulator config use `EMPLOYEE_NEW` / `EMPLOYEE_CHANGE`
  - LSN watermark table `dbo.LsnStates` (`CaptureName`, `LastProcessedLsn varbinary(10)`, `LastUpdatedUtc`) via EF `SaveChanges`
  - Env: `ConnectionStrings__AgencySuiteDb`, `ServiceBus__FullyQualifiedNamespace` or `ServiceBus__ConnectionString`, `ServiceBus__QueueName`, `CdcPollCron`, `Cdc__CaptureName` / `ContactCaptureName` / `ContactRoleCaptureName`
  - Writes AgencySuite `LsnStates` only; does not write PTTN and does not call Rulesengine
  - No service-side JWT validation

#### `pttn-address-projection`
- **Type**: Azure Functions worker (isolated, timer trigger). Not an HTTP API and not CDC polling
- **GitHub**: `Briggs-Walker/pttn-address-projection`
- **Technology**: .NET 10 (`net10.0`, Azure Functions v4 isolated worker) + `Microsoft.Data.SqlClient` / `SqlBulkCopy` (no EF, no Helm chart)
- **Purpose**: Nightly rebuild of the NL address read model used by address endpoints
- **Dependencies**: PTTN (read-only), PluginDB `address_management` (read/write), Briggsbase `dbo.domain` / `dbo.plugin` / `dbo.domain_plugin` (read-only, plugin id `briggs-address-module`)
- **Deployment**: GitHub Actions `deploy_dev.yaml` / `deploy_eu.yaml` → Azure Function App (not `plugin-deploy` Helm)
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`, `docs/databases/pttn-database-schema.md`, `docs/databases/plugindb-database-schema.md`
- **Key Features**:
  - Timer `AddressProjectionNightlyRebuild` (`0 0 * * * *`); `host.json` `functionTimeout` 02:00:00, `maxConcurrentFunctions: 1`
  - Domain scope: only domains where `briggs-address-module` is active in briggsbase
  - PTTN reads `PROJECT_ADDRESS_IMPORT_BATCH`, `PROJECT_ADDRESS_IMPORT`, `PROJECT_ADDRESS`, `ADDRESS_NL`, `ADDRESS_CONTACT`, `PROJECT_RESULT`, `LOCATION`
  - Writes `plugindb.address_management` projection tables only; **no PTTN writes**, no Rulesengine client, no `HttpClient`, no JWT packages
  - Projection grain: Domain + Project (+ office attribute from last contact). Account is not in the address-file grain. Downstream address APIs must still enforce Domain → Account → Project → Office
  - Dates stored as `datetime2` UTC (`SYSUTCDATETIME()`, ISO-8601 env parse for `PTTN_PROJECTION_MIN_BATCH_PROCESSED_AT_UTC`)

#### `file-upload-api`
- **Type**: File Processing Service
- **GitHub**: `Briggs-Walker/file-upload-api` (`plugin_id` `file-upload-api`)
- **Technology**: .NET 9 (`net9.0`, `sdk:9.0` / `aspnet:9.0`) + Azure Files + Azure Service Bus + ffmpeg (`FFMpegCore`)
- **Purpose**: Image upload with ClamAV scan, plus async voice-log ingest
- **Dependencies**: Azure File Storage (`AZURE_STORAGE_*`), ClamAV HTTP (`CLAMAV_SERVICE_BASE_URL` → `POST /scan?fileName=`), Service Bus queue `voicelog-processing`. No Keycloak/JWT packages; identity is KrakenD headers if the route is on the gateway
- **Deployment**: Centralized `plugin-deploy` backend workflows; `config.json` `backend_port` 8080
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`, `docs/stack/clamav/clamav-patterns.md`
- **Key Features**:
  - `POST /files/upload` — multipart, 5 MB cap, temp share → ClamAV → images directory
  - `POST /voicelog/upload` — 50 MB cap, `accountDomain` form/query, enqueue conversion (not listed in `config.json` `plugin_routes`)
  - No `AddJwtBearer` / `UseAuthentication`
  - Inter-service ClamAV `HttpClient` must still go through KrakenD (open finding if `CLAMAV_SERVICE_BASE_URL` is a cluster DNS name)

### Logging Services

#### `briggslogging`
- **Type**: Microservice API + npm client (`@briggs-walker/briggs-logging`)
- **Technology**: .NET 9 + Entity Framework + SQL Server
- **Purpose**: Frontend/event log ingestion for the Briggs System
- **Dependencies**: Dedicated `logging` SQL database, Gateway API (identity headers after KrakenD)
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet/dotnet-quick-reference.md`
- **Key Features**:
  - Write-only `POST /logging/event` ingestion
  - npm Tracker client posting through the gateway
  - Structured event properties and device metadata
  - Database migration support
  - **Known fidelity gap (2026-09-22 audit):** service still validates a body JWT against Keycloak and does not persist Domain → Account → Project → Office — treat as **code violates contract**, not policy change

### PTTN Microservices

#### `pttn-projectsapi`
- **Type**: Microservice API
- **GitHub**: `Briggs-Walker/pttn-projectsapi`
- **Technology**: .NET 10 + Dapper (with EF Core for some reads) + SQL Server
- **Purpose**: Comprehensive project management and operational data access for field marketing operations
- **Dependencies**: PTTN Database, Gateway API (identity headers after KrakenD), Rules Service API (`PTTN_RULES_SERVICE_API_URL`). Unused `Microsoft.AspNetCore.Authentication.JwtBearer` package is present; `Program.cs` has no `AddJwtBearer`
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`
- **Key Features**:
  - Project lifecycle management and configuration
  - Authorized list/filter via `x-auth-projects`; several GET/POST paths still omit that header (see open finding)
  - Project location and shift management
  - Quarter status changes via stored procedure `pttn.action_442` (direct PTTN write — **code violates contract**; do not weaken Rulesengine policy)
  - Field operations data retrieval (shifts, crew, performance)
  - KPI reporting and project analytics
  - Customer export generation; HMAC download tokens (not Keycloak JWT)
  - Integration with Rules Service for some synchronization
  - Bulk operations for location and shift queries

#### `pttn-onboarding-api`
- **Type**: Microservice API
- **GitHub**: `Briggs-Walker/pttn-onboarding-api`
- **Technology**: .NET 10 + Dapper + SQL Server
- **Purpose**: User and organization onboarding workflow management with project setup orchestration
- **Dependencies**: PTTN Database, Gateway API, Rules Service API (`BRIGGSANDWALKER_API_URL`), Azure Service Bus
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`
- **Key Features**:
  - Organization registration and domain setup (Global/Agency domains)
  - User registration queued to Service Bus then written via Rulesengine
  - Domain code determination and assignment
  - Project setup queued to Service Bus then written via Rulesengine
  - Campaign and account creation and management
  - Sales channel configuration and setup
  - Form element and export configuration
  - Plugin activation and system integration
  - `CompanyCountry` ISO 3166-1 alpha-2; project-setup `Language` ISO 639-1; organization `Language` is unconstrained (open finding)
  - No service-side JWT validation

#### `pttn-crewapi`
- **Type**: Microservice API
- **GitHub**: `Briggs-Walker/pttn-crewapi`
- **Technology**: .NET 10 + Dapper + EF Core + SQL Server
- **Purpose**: Crew member management and operational data access for field marketing operations
- **Dependencies**: PTTN Database, Gateway API, Rules Service API, Keycloak Admin API (user create/delete, not JWT validation), `PROJECTS_API_BASE_URL` (inter-service; must go through KrakenD)
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`
- **Key Features**:
  - Crew member creation via Keycloak Admin + Rulesengine (`CreateCrewMemberRulesAsync`); POST has a TODO and does not check `x-auth-domain-office`
  - Domain-office scoped list/search via `x-auth-domain-office`
  - Direct SQL `UPDATE` on `pttn.CREW_MEMBER_SHIFT` / `pttn.TEAM` for shift start/end (**code violates contract**)
  - Lightweight crew data access for UI dropdowns (`/crew/light`)
  - Marketing code generation and uniqueness validation
  - Shift-based activity and performance monitoring

#### `pttn-planningapi`
- **Type**: Microservice API
- **GitHub**: `Briggs-Walker/pttn-planningapi` (hyphenated `pttn-planning-api` in older docs is the same service)
- **Technology**: .NET 9 + Dapper + SQL Server
- **Purpose**: Crew planning, shift management, and team composition for field operations
- **Dependencies**: PTTN Database, Gateway API, Briggs & Walker Rules Service (`BRIGGSANDWALKER_BASE_URL`). Unused JwtBearer package and unused `using` in `Program.cs`; no `AddJwtBearer` / `UseAuthentication`
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`
- **Key Features**:
  - Shift list via `x-auth-domain-office`
  - Assign/delete crew through Rulesengine client (`api/v1/RulesService`)
  - Team create/compose via Rulesengine
  - `POST /planning/refresh-shift` has no authorization header (open finding)
  - Direct database access for reads

#### `pttn-formsapi`
- **Type**: Microservice API
- **GitHub**: `Briggs-Walker/pttn-formsapi` (hyphenated `pttn-forms-api` in older docs is the same service; csproj `pttn-formapi`)
- **Technology**: .NET 10 + Entity Framework Core + SQL Server
- **Purpose**: Form element configuration and data retrieval for PTTN field marketing operations
- **Dependencies**: PTTN Database, Gateway API, Briggs Content Delivery (`BRIGGS_CONTENT_DELIVERY_SERVICE_API_URL`)
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`
- **Key Features**:
  - Form GET scoped with `x-auth-projects`
  - `GET results/{formId}/basic-info` and `/api/internal/forms` omit tenant headers (open finding)
  - `POST /api/internal/forms` inserts via EF `SaveChanges` into PTTN (**code violates contract**)
  - Multi-language form support
  - No service-side JWT validation

#### `pttn-authapi`
- **Type**: Microservice API (KrakenD grant lookup)
- **GitHub**: `Briggs-Walker/pttn-authapi` (`plugin_id` `pttn-authapi`; `config.json` `routes` empty)
- **Technology**: .NET 10 + Dapper + SQL Server (EF SqlServer package unused; no `DbContext`)
- **Purpose**: Domain, project, office, and AgencySuite grant lookups for the KrakenD authorization plugin (`authAPI`)
- **Dependencies**: PTTN Database (`PTTN_DB_CONNECTION_STRING`), AgencySuite Database (`AGENCYSUITE_DB_CONNECTION_STRING`). No Keycloak, no JwtBearer, no outbound HTTP
- **Deployment**: Centralized plugin-deploy templates; container port 8080
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`, `docs/stack/krakend/krakend-auth-plugin-development.md`
- **Key Features**:
  - `GET /api/domains`, `/api/domains/token`, `/api/domains/legacy-token` (`API_TOKEN` on `pttn.PTTN_DOMAIN` — not JWT)
  - `GET /api/projects/authorized` returns `{ Projects: [{ projectCode, domainCode, roles }] }`
  - `GET /api/offices` and `/api/offices/token`
  - `GET /api/as` and `/api/as/token` (AgencySuite `formation_post_filling`)
  - Read-only Dapper; no PTTN writes
  - No `AddJwtBearer` / `UseAuthentication`
  - Grant endpoints currently take query `userId` instead of `x-sub` (**code violates contract**)
  - Agency project SQL omits `pttn.PROJECT_PTTN_DOMAIN` (**code violates contract**; keep four-level tenancy)

### Kickstarter Modules

#### `module-onboarding`
- **Type**: Microfrontend Module
- **Technology**: React + TypeScript + Vite + Module Federation
- **Purpose**: User onboarding and account creation workflow interface
- **Dependencies**: pttn-onboarding-api, briggsdesignsystem, Gateway API
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - Multi-step user onboarding wizard (Getting to Know You, Company, Legal)
  - Account creation and signup flow
  - Progress tracking with visual progress indicators
  - Multi-language UI (en, en-GB, nl, es, it, fr, de, pt). API language fields must use ISO 639-1 (`en`, `nl`, …), not BCP47 (`en-GB`)
  - Responsive design with Tailwind CSS
  - Module federation with exposed entry points for SignUpPage, OnboardingPage, and AccountCreatingPage
  - State management with Zustand
  - Integration with Briggs Design System
  - Email validation and form handling

#### `module-projectwizard`
- **Type**: Microfrontend Module
- **Technology**: React + TypeScript + Vite + Module Federation
- **Purpose**: Project creation and onboarding wizard for new project setup workflows
- **GitHub**: `Briggs-Walker/module-projectwizard` (`plugin_id` `module-projectwizard`)
- **Dependencies**: briggsdesignsystem, briggs-logging, Gateway API (Keycloak via orchestrator/auth module)
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - Multi-step project onboarding wizard
  - Project information collection and validation
  - Design and branding: color selection (logo upload is not wired; `BrandLogoFileName` is sent empty)
  - Donation settings and amount configuration (API currencies ISO 4217: EUR, USD, GBP)
  - Terms and agreement handling
  - Multi-language UI (en, en-GB, nl, es, it, fr, de, pt). API `Language` must use ISO 639-1 (`en`, `nl`, …), not BCP47 (`en-GB`). Country fields on project-setup payloads must be ISO 3166-1 alpha-2
  - Integration with Briggs Design System
  - State management with Zustand
  - Federation: name `ProjectWizard`; exposes `./OnboardingPage`, `./ProjectCreatingPage`; container port 3000; Vite dev 5184 / preview 5185

#### `module-dashboardbasic`
- **Type**: Microfrontend Module
- **Technology**: React + TypeScript + Vite + Module Federation
- **Purpose**: Basic dashboard interface providing project overview, planning, daily activity tracking, and quick actions
- **GitHub**: `Briggs-Walker/modules-dashboardbasic` (`plugin_id` `module-dashboardbasic`)
- **Dependencies**: briggsdesignsystem, briggs-logging, Gateway API (Keycloak via orchestrator). Shared PTTN routes (`/api/projects/kpi`, `/planning`, `/crew`, `/api/events/*`) — not a dedicated `/api/dashboardbasic` backend
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - Project overview dashboard with KPI visualization (shifts, signups, donation values)
  - Quick actions interface (manage project, manage crew, start fundraising, export results)
  - Daily activity timeline and progress tracking
  - Planning module integration for shift and crew management
  - QR code generation for mobile app links
  - Multi-language UI (en, en-GB, nl, es, it, fr, de, pt). There is no `en-US` locale file. API language fields must use ISO 639-1 (`en`), not BCP47 (`en-GB`)
  - Responsive design with Tailwind CSS
  - Federation: name `BasicDashboard`; exposes `./DashboardPage`
  - Integration with Briggs logging and design system

#### `module-projectbasic`
- **Type**: Microfrontend Module
- **Technology**: React + TypeScript + Vite + Module Federation
- **Purpose**: Project listing, shift visualization, forms management, and export interface
- **GitHub**: `Briggs-Walker/module-projectbasic` (`plugin_id` `module-projectbasic`)
- **Dependencies**: briggsdesignsystem, briggs-logging, Gateway API, PTTN Projects API, pttn-crewapi (`/crew/light`), pttn-formsapi (form versions / project forms)
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - All-projects listing and per-project shift data visualization
  - Crew member filtering and search
  - Date range filtering (query dates `YYYY-MM-DD`)
  - Export create/list/download for project data
  - Project forms: version create/publish and preview
  - Multi-language UI (en, en-GB, nl, es, it, fr, de, pt)
  - Responsive design with Tailwind CSS
- **Federation Config**:
  - Name: `ProjectBasic`
  - Exposed: `./ProjectsPage`, `./AllProjectsPage`, `./ProjectFormsPage`
  - Port: 5179 (dev)

#### `modules-crewbasic` (frontend)
- **Type**: Microfrontend Module
- **Technology**: React + TypeScript + Vite + Module Federation
- **Purpose**: Basic crew management interface for field operations and crew tracking
- **GitHub**: `Briggs-Walker/modules-crewbasic` (`plugin_id` `module-crewbasic`)
- **Dependencies**: briggsdesignsystem, briggs-logging, Gateway API, pttn-crewapi (via gateway `/crew`). This repository is frontend-only; there is no dedicated `modules-crewbasic` backend service
- **Deployment**: Uses centralized deployment templates
- **Documentation**: `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - Crew list, search, sort, pagination, and create/invite
  - Module federation with exposed CrewPage component
  - Multi-language UI (en, en-GB, nl, es, it, fr, de, pt). API `locale` / language fields must use ISO 639-1 (`en`), not BCP47 (`en-GB`)
  - Design system integration
  - Responsive design with Tailwind CSS
- **Federation Config**:
  - Name: `BasicCrew`
  - Exposed: `./CrewPage`
  - Port: 5176 (dev), 5177 (preview)

### Modules

#### `modules-quartercompletion` (monorepo; plugin_id `module-quartercompletion`)
- **Type**: Plugin monorepo (ASP.NET API + React microfrontend)
- **Technology**: .NET 9 + Entity Framework + SQL Server (PluginDB `quarter_completion` schema); React + TypeScript + Vite + Module Federation
- **Purpose**: Quarter completion tracking and project activation UI and API
- **GitHub**: `Briggs-Walker/modules-quartercompletion`
- **Dependencies**: PluginDB, briggsdesignsystem, Gateway API / KrakenD plugin routes (`/api/quarter_completion`). Inter-service calls must go through KrakenD. PTTN writes remain Rulesengine-owned (do not treat a direct `pttn-projectsapi` HTTP client as the contract). The unused `PTTNPlanningAPIClient` stub is not a live dependency
- **Deployment**: Uses centralized deployment templates (`plugin-deploy` reusable workflows)
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`, `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - Backend: project activation/deactivation, quarter status, PluginDB persistence, service-bus project events
  - Authorization at the gateway plugin (`ProjectsDomains`) plus `x-auth-projects` (domain + project). Domain → Account → Project → Office remains the tenant contract; this plugin currently scopes Domain + Project
  - Frontend: project and quarter pages; federation name `QuarterCompletion`; exposes `./ProjectsPage`, `./QuartersPage`; Vite dev 5175 / preview 5176
  - i18n scaffold: `en`, `nl` placeholder locales (not the eight-locale kickstarter set)
  - `POST /quarters/{id}/threshold` is registered in `config.json` but the controller action is commented out

#### `modules-forms` (frontend; plugin_id `module-forms`)
- **Type**: Microfrontend Module
- **GitHub**: `Briggs-Walker/modules-forms`
- **Technology**: React 19 + TypeScript + Vite + Module Federation (`@originjs/vite-plugin-federation`) + Tailwind 4 + Zustand
- **Purpose**: Field form renderer (preview and fill) against pttn-formsapi via the gateway
- **Dependencies**: briggsdesignsystem `^2.1.2`, briggs-logging, Gateway API (`VITE_GATEWAY_URL` / `forms_env`). Frontend-only (`backend_port` empty)
- **Deployment**: Centralized `plugin-deploy` frontend workflows; container port 3000
- **Documentation**: `docs/stack/react/react-module-architecture.md`
- **Key Features**:
  - Federation name `Forms`; exposes `./FormPage`
  - Vite dev 5186 / preview 5187
  - Reads `/api/Forms/{id}`, `/forms/versions/{id}/{version}`, `/api/Forms/project-results?projectCode&domainCode` with Bearer to KrakenD
  - UI locales `en-GB`, `en`, `nl`, `es`, `it`, `fr`, `de`, `pt`. API language fields remain ISO 639-1
  - Query params include `projectCode`, `domainCode`, `officeCode` (no Account grain in the URL)

#### `field-apis`
- **Type**: Microservice API (field helpers)
- **GitHub**: `Briggs-Walker/field-apis` (`plugin_id` `field-apis`)
- **Technology**: .NET 10 (`net10.0`, `sdk:10.0-noble` / `aspnet:10.0-noble`). EF SqlServer packages are referenced but unused (no `DbContext`)
- **Purpose**: SMS, Loqate address lookup, IBAN and email validation, generic outbound HTTP
- **Dependencies**: CM.com SMS, Loqate, SepaTools, Email Hippo, pttn-projectsapi internal SMS-template route (`PttnProjectsClient:BaseUrl`)
- **Deployment**: Centralized `plugin-deploy` backend workflows; container 8080; Dockerfile `USER 1000:1000`
- **Documentation**: `docs/stack/dotnet/dotnet-architecture.md`
- **Key Features**:
  - Live routes: `POST /sms/send`, `GET /address/search`, `GET /address/search/{id}`, `POST /iban/validate`, `POST /email/validate`, `POST /external-service/call`
  - `config.json` currently lists only SMS and address (gateway discovery incomplete)
  - Address lookup hard-codes Loqate `Countries=AU`
  - SMS NL mobile prefix `0…` → `+31`
  - `Program.cs` has no `AddJwtBearer`. `Helpers/JwtHelper.cs` still validates Keycloak JWKS signatures (**code violates contract**; delete the helper; do not document it as allowed)
  - Inter-service projects API must go through KrakenD

### Integrator

#### `Koppelplatform`
- **Type**: Legacy PHP integrator (not a Kickstarter module and not a Helm microservice)
- **GitHub**: `Briggs-Walker/Koppelplatform`
- **Technology**: PHP 8.5 + Laravel 13 + MongoDB + Guzzle. No `config.json`; stack detection is `artisan` + `composer.json`
- **Purpose**: Partner dispatch, PTTN poll (teams/results/addressContact), 4DMC import/export, FTP
- **Dependencies**: PTTN HTTP API (`PTTN_API_*_URL` + query `token`, not KrakenD identity headers), MongoDB, partner Keycloak **client_credentials** for outbound Mediahuis (not inbound JWT validation)
- **Deployment**: `plugin-deploy` workflow `koppelplatform-deploy.yaml` (not the shared `helm/backend` chart)
- **Documentation**: `docs/repository-overview.md` (no `docs/stack/laravel/`)
- **Key Features**:
  - PTTN **reads** via `PttnApiProvider` (`listTeams`, `listResults`, `getAddressContact`); `teamdate` is `Y-m-d`
  - Partner DB writes via `RemoteDatabaseProvider` (not PTTN SQL and not Rulesengine)
  - No `AddJwtBearer` equivalent; session/Entrust app auth is separate from Briggs gateway JWT

#### `DWH`
- **Type**: Operational data warehouse (not a Kickstarter module and not a Helm microservice)
- **GitHub**: `Briggs-Walker/DWH` (default branch `main`)
- **Technology**: PHP 8.3 (FrankenPHP image) + Laravel 10 (`composer.json` allows `php: ^8.1`) + MySQL `dwh8` + SQL Server (`pttn`, `pttn_lu`, AgencySuite `ast`) + MongoDB `integrator` + Redis/Horizon + Laravel Nova/Sanctum. No `config.json`; stack detection is `artisan` + `composer.json`
- **Purpose**: Poll PTTN and AgencySuite into MySQL warehouse tables and client DWH databases; crew dashboards; scheduled partner export jobs
- **Dependencies**: PTTN SQL Server (`DB_PTTN_*`, views such as `dwh8_shifts`), AgencySuite SQL, client MySQL warehouses (`kpn_dwh8`, `gdl_dwh8`, …). No Keycloak JWT packages; admin/API auth is session + Sanctum, not KrakenD identity headers
- **Deployment**: In-repo `.github/workflows/backend-build-*.yaml` and `backend-deploy-prod.yaml` call `plugin-deploy` `koppelplatform-deploy.yaml`; image name `briggs-dwh`. Not the shared `helm/backend` chart
- **Documentation**: `docs/repository-overview.md` (no `docs/stack/laravel/`)
- **Key Features**:
  - PTTN **reads** via `DB::connection('pttn')` and PTTN-side views (`dwh8_*`); warehouse **writes** go to MySQL `dwh8` / client DWH connections
  - `StoreKPNProjectAddresses` / `StoreKPNZProjectAddresses` **INSERT** `pttn.PROJECT_ADDRESS_IMP_EXTERNAL` (direct PTTN write; **code violates contract** — Rulesengine remains required)
  - Sanctum API `GET /api/pttn/contact-results` reads PTTN result history without Domain → Account → Project → Office filters
  - Contact-results query params use `Y-m-d H:i:s`; KPN import expiration is written as `d-m-Y` (**not** ISO 8601)
  - No service-side JWT validation; do not add Keycloak JWT to this app

---

## Standard Repository Template

For new repositories, follow this structure and configuration:

### Repository Metadata
```yaml
name: "repository-name"
type: "microservice|microfrontend|library|infrastructure"
technology: "dotnet|react|node|python|other"
purpose: "Brief description of repository purpose"
domain: "business-domain-name"
owner_team: "team-name"
```

### Dependencies
```yaml
runtime_dependencies:
  - dependency-name: "purpose/relationship"
  
development_dependencies:
  - shared-docs: "Architecture and best practices"
  - briggsdesignsystem: "UI components (frontend only)"
```

### Configuration Files
- `config.json` - Service configuration and routing
- `docs/` - Architecture documentation (copied from shared-docs)
- `.github/copilot-instructions.md` - AI assistant guidance

### Deployment
- Uses centralized deployment templates from shared-docs
- Environment-specific workflows (dev, staging, production)
- Automated CI/CD with GitHub Actions

---

## Development Guidelines

### Repository Naming Convention
- **Microfrontends**: `module-{domain-name}` (e.g., `module-projects`, `module-crew`)
- **Microservices**: `api-{domain-name}` or `{domain-name}-api` (e.g., `projects-api`, `crew-management-api`)
- **Libraries**: `{library-name}` (e.g., `briggsdesignsystem`, `logging-utils`)
- **Infrastructure**: `{service-name}` (e.g., `briggs-gateway-api`, `auth`)
- **Security Services**: `{service-name}` (e.g., `clamav`, `security-scanner`)

### File Structure Requirements
```
repository-root/
├── config.json                 # Service configuration
├── docs/                      # Architecture documentation
│   ├── application-architecture.md
│   ├── domain-architecture.md
│   └── stack/                 # Technology-specific guides
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/             # CI/CD workflows
├── src/                       # Source code
├── tests/                     # Test files
└── README.md                  # Repository-specific documentation
```

### Technology Stack Alignment
- **Frontend**: React + TypeScript + Vite + Module Federation
- **Backend**: .NET 8+ + Entity Framework + SQL Server
- **Design Systems**: React + TypeScript + Storybook + Tailwind CSS
- **Gateway**: KrakenD
- **Authentication**: Keycloak
- **Security**: ClamAV + Docker for antivirus scanning
- **Deployment**: Kubernetes + Helm + Azure Container Registry
- **Monitoring**: Application Insights + Structured Logging

---

## Repository Lifecycle

### Creation Checklist
- [ ] Repository created with appropriate naming convention
- [ ] Copied shared documentation from `shared-docs`
- [ ] Configured `config.json` with routes and metadata
- [ ] Added appropriate deployment workflows
- [ ] Implemented health check endpoints
- [ ] Added to gateway route discovery
- [ ] Updated this repository overview

### Maintenance Standards
- **Documentation**: Keep architecture docs synchronized with shared-docs
- **Dependencies**: Regular updates for security and compatibility
- **Testing**: Maintain test coverage above 80%
- **Code Quality**: Follow linting and formatting standards
- **Monitoring**: Implement structured logging and health checks

### Retirement Process
- [ ] Remove from gateway route discovery
- [ ] Update dependent services
- [ ] Archive repository with clear deprecation notice
- [ ] Update this repository overview

---

## AI Agent Usage Notes

### For Code Generation
- Each repository includes `docs/` folder with architecture patterns
- Copilot instructions ensure adherence to architectural principles
- Technology-specific guidance available in `docs/stack/`

### For Understanding System Architecture
- Repository relationships define service boundaries
- Data flow diagrams show integration patterns
- Deployment workflows indicate operational requirements

### For Development Assistance
- Standard templates reduce setup time
- Shared documentation ensures consistency
- Automated workflows handle deployment complexity

This repository overview serves as the single source of truth for understanding the Briggs System's distributed architecture and should be updated whenever repositories are added, modified, or retired.