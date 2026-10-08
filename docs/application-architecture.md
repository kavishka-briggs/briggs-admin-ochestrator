# Briggs System - Microservice Application Architecture

## 🔐 **CRITICAL: Authentication Architecture**

> **BEFORE implementing authentication in ANY service**: Read [`authentication-architecture-principles.md`](authentication-architecture-principles.md)
>
> **ONLY KrakenD validates JWT tokens**. Individual microservices receive pre-authenticated requests with user context in headers.

## Overview

This microservice is part of the Briggs System ecosystem, providing domain-specific functionality for the core ERP system. This document explains how microservices fit into the broader architecture and their role in the distributed system.

## System Context

### Briggs System Architecture

The Briggs System follows a **microservices architecture with microfrontends** pattern, where:

- **PTTN** (the full name) represents the core ERP system with a monolithic database
- Multiple microservices provide functional access to different parts of the PTTN data model
- Each microservice can be paired with its own frontend (microfrontend) when stored in the same repository
- The system is designed to gradually split the monolithic PTTN database into smaller, domain-specific databases

### Database Architecture

The system operates with three main databases:

#### 1. PTTN Database (SQL Server)
- **Purpose**: Core ERP system data storage (monolithic)
- **Access Pattern**: 
  - Direct read access for services that need real-time data (must remain domain-scoped)
  - **PTTN writes** go through the Rulesengine API only. Direct INSERT/UPDATE/DELETE and ad-hoc stored-procedure writes from services are prohibited. Policy in `docs/policy/` is authoritative. CDC pollers may persist an operational LSN watermark; that is not an application PTTN write.
- **Contains**: Projects, shifts, locations, domain assignments, and core business data

#### 2. Briggsbase Database (SQL Server)
- **Purpose**: System configuration and module registry
- **Contains**:
  - Module registrations
  - Route definitions for API Gateway
  - User domain assignments
  - Active modules per domain configuration

#### 3. Plugindb Database (SQL Server)
- **Purpose**: Plugin and extension data storage
- **Location**: Same server as other databases
- **Access**: Through specialized plugin services

### Database Schema Documentation

For detailed table structures, relationships, and data models, see:
- **PTTN Database Schema**: `docs/databases/pttn-database-schema.md`
- **Briggsbase Database Schema**: `docs/databases/briggsbase-database-schema.md`
- **Plugindb Database Schema**: `docs/databases/plugindb-database-schema.md`
- **Database Access Patterns**: `docs/databases/database-access-patterns.md`

**Schema Documentation Includes**:
- Table definitions with column types and constraints
- Primary and foreign key relationships
- Indexes and performance considerations
- Data access patterns by service
- Evolution roadmap for database decomposition

## Service Architecture

### API Gateway Pattern

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Microfrontend  │───▶│  Krakend Gateway │───▶│   Microservice      │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              │                           │
                              ▼                           ▼
                       ┌─────────────┐            ┌─────────────┐
                       │ Briggsbase  │            │ Data Store  │
                       │ (Routes)    │            │ (Direct)    │
                       └─────────────┘            └─────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │ Rulesengine │
                                                  │ API (Writes)│
                                                  └─────────────┘
```

#### Krakend API Gateway
- **Dynamic Route Discovery**: Reads route configurations from briggsbase routes table
- **Authentication & Authorization**: Centralized security layer
- **Traffic Management**: All microfrontend communication flows through the gateway
- **Service Discovery**: Routes requests to appropriate microservices

### PTTN Event-Driven Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  PTTN SQL Server CDC│───▶│  CDC Function    │───▶│   Service Bus       │
│   (Change Tables)   │    │  (Polling)       │    │   (Topics)          │
└─────────────────────┘    └──────────────────┘    └─────────────────────┘
                                    │                           │
                                    ▼                           ▼
                             ┌─────────────┐            ┌─────────────┐
                             │ LSN Tracker │            │ Consumer    │
                             │ (Offset)    │            │ Services    │
                             └─────────────┘            └─────────────┘
```

#### CDC Data Integration Service
- **Change Data Capture**: Timer pollers read SQL Server CDC change tables (`cdc-pttn` for PTTN `cdc.pttn_TOPIC_EVENT_CT`; `cdc-agencysuite` for AgencySuite sales-order and employee captures)
- **Event Streaming**: Publishes changes to Service Bus topics and/or queues for downstream processing (`cdc-agencysuite` sales orders use queue `sales-orders`)
- **LSN Tracking**: Maintains Log Sequence Number offsets so processing is ordered and **at-least-once** (consumers must be idempotent). Do not document this path as exactly-once; neither poller uses a distributed transaction around publish + watermark
- **Deployment**: Current CDC repositories deploy Azure Functions isolated workers. Kubernetes with KEDA is an optional high-volume model and is **not** present in `cdc-pttn` or `cdc-agencysuite`
- **Topic/queue routing**: `cdc-pttn` uses the CDC row `topic` column; `cdc-agencysuite` uses configured queue and employee topic names
- **PTTN writes**: Capturing CDC is a **read** of change tables plus an operational watermark. Application PTTN writes remain Rulesengine-owned. Do not treat `cdc-pttn`'s `dbo.cdc_offset_tracker` update as a business write
- **JWT**: CDC timer functions do not validate JWTs. Only KrakenD validates tokens for HTTP APIs

### Data Access Patterns

#### Read Operations
- **Direct Database Access**: Services can read directly from the primary data store for real-time data requirements
- **Performance Optimization**: Direct reads eliminate network hops and reduce latency
- **Domain Filtering**: Access is automatically scoped to authorized domains

#### Write Operations
- **PTTN**: All application writes must go through the Rulesengine API. Direct table writes and ad-hoc stored-procedure calls from services are prohibited. Do not treat a stored-procedure path as an approved alternative.
- **CDC watermarks**: `cdc-pttn` may update `dbo.cdc_offset_tracker`. That is operational offset state after publishing events, not a Rulesengine bypass.
- **PluginDB / Briggsbase**: Owning services may write their configuration or plugin stores with mandatory domain filtering (for example the address projection worker bulk-loads `plugindb.address_management`).
- **Audit Trail**: Rulesengine remains the PTTN mutation and audit path.

## Authorization Model

### Domain-Based Access Control

The system implements a sophisticated domain-based authorization model:

#### 1. User Domain Assignment
- Users are assigned to specific domains in the briggsbase database
- Domain assignment determines data access scope
- Cross-domain access is controlled and audited

#### 2. Orchestrator Service
- **Responsibility**: Determines user authorization after login
- **Process**:
  1. Identifies domains the user is authorized for
  2. Queries briggsbase to find active modules per domain
  3. Builds user-specific module and route configuration
- **Timing**: Executed immediately after user authentication

#### 3. API-Level Authorization
- **Controller-Level Security**: All API endpoints enforce authorization requirements
- **Domain-Based Filtering**: Access is automatically scoped to user's authorized domains
- **Context Propagation**: Authorization context flows through all service layers

## Deployment Architecture

### Azure Kubernetes Service (AKS)

```
┌─────────────────────┐
│   Nginx Controller  │  ← Entry point for all traffic
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Krakend Gateway    │  ← API Gateway & Auth
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   Microservice      │  ← Business logic service
│   (Container)       │
└─────────────────────┘
```

#### Container Strategy
- Each repository contains a `Dockerfile` for containerization
- Helm charts managed in a separate deployment repository
- Standard Kubernetes resources: Deployment, Service, Secrets, Ingress

#### Traffic Flow
1. **Nginx Controller**: Ingress point for all cluster traffic
2. **Krakend Gateway**: Route resolution and security enforcement
3. **Microservice**: Business logic and data access

## Module Registration & Discovery

### Config-Driven Registration

The `config.json` file at the repository root defines:

```json
{
  "module": "service-name",
  "routes": [
    {
      "path": "/api/resource",
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "auth": "required"
    },
    {
      "path": "/api/resource/{id}/subresource",
      "methods": ["GET"],
      "auth": "required"
    }
  ]
}
```

#### Deployment Process
1. **Build Pipeline**: Shared build/deploy repository orchestrates deployment
2. **Module Registration**: Routes from `config.json` are registered in briggsbase
3. **Service Discovery**: Krakend gateway discovers new routes automatically
4. **Health Checks**: Kubernetes monitors service health and availability

## Integration Patterns

### Service Communication

#### Synchronous Communication
- REST API calls through the gateway
- Direct database reads for performance
- Circuit breaker patterns for resilience

#### Asynchronous Communication
- Event-driven updates for data consistency
- Message queues for long-running operations
- Domain events for business process coordination
- **CDC Event Streaming**: Real-time change data capture publishes database changes to Service Bus topics for event-driven architectures

### Data Consistency

#### Read Consistency
- Direct database access ensures immediate consistency for reads
- Caching strategies for frequently accessed data

#### Write Consistency
- Rulesengine API ensures business rule enforcement
- Database stored procedures provide alternative write path with built-in validation
- Transaction management across service boundaries
- Eventual consistency for cross-domain operations

## Security Architecture

### Multi-Layer Security

1. **Network Security**: Kubernetes network policies and ingress controls
2. **API Gateway Security**: Authentication, authorization, and rate limiting (KrakenD only)
3. **Service Security**: User context extraction and domain-based access control
4. **Data Security**: Database-level permissions and encryption

### Authorization Headers

The system uses custom authorization headers for context propagation across service boundaries. KrakenD validates JWT tokens and extracts user identity, roles, and authorized domain information, then passes this context to backend services via HTTP headers (`x-sub`, `x-user-roles`, `x-user-domain`, etc.).

## Monitoring & Observability

### Application Monitoring
- Health check endpoints for Kubernetes probes
- Structured logging with correlation IDs
- Performance metrics and alerting

### Business Monitoring
- Domain-specific KPIs and reporting
- Audit trails for compliance requirements
- Real-time dashboards for operational visibility

## Future Evolution

### Database Decomposition Strategy
As the system evolves, the monolithic PTTN database will be gradually decomposed:

1. **Domain Identification**: Identify bounded contexts within the monolith
2. **Service Extraction**: Extract services with their data stores
3. **Data Migration**: Migrate domain-specific data to new databases
4. **Interface Evolution**: Maintain backward compatibility during transition

### Microservice Maturation
- Service mesh implementation for advanced traffic management
- Event sourcing for complex business processes
- CQRS patterns for read/write optimization
- Domain-driven design principles for service boundaries

## Development Guidelines

### Repository Structure
- Frontend + Backend in same repo = Tightly coupled module
- Separate backend repos = Functional data access services
- Each service owns its deployment configuration

### API Design
- RESTful conventions with domain-specific adaptations
- Consistent error handling and response formats
- Version management for backward compatibility
- OpenAPI documentation for service contracts

### Testing Strategy
- Unit tests for business logic
- Integration tests with test databases
- Contract testing between services
- End-to-end testing through the gateway

---

This architecture supports the Briggs System's goals of modularity, scalability, and gradual evolution from a monolithic to a truly distributed system while maintaining operational excellence and security standards.