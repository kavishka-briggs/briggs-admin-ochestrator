# Briggs System - Domain Architecture

## Overview

Applications operate as a multi-tenant environment designed to support field marketing operations across multiple countries and organizations. This document outlines the domain-based architecture, user management, and authorization patterns that enable secure, scalable operations.

## Multi-Tenant Architecture

### Shared Infrastructure Model

The system employs a **shared database, logical isolation** approach:

- **Shared Database**: All tenants utilize the same physical resources (servers, storage, compute) to optimize cost and operational efficiency
- **Logical Isolation**: Data segregation is achieved through domain-based partitioning, where every record is associated with a specific tenant domain
- **Domain Identification**: Most database tables include a `DOMAIN_CODE` field (or similar) that establishes the tenant ownership of each record

### Benefits of This Approach

1. **Cost Efficiency**: Shared infrastructure reduces per-tenant costs
2. **Operational Simplicity**: Single database to maintain and backup
3. **Performance**: Optimized resource utilization across tenants
4. **Scalability**: Easy to onboard new tenants without infrastructure changes

## Domain Structure

### Geographic Organization

Each domain corresponds to a specific **country**. Organizations operating across multiple countries maintain separate domains for each geographic region, enabling:

- Country-specific compliance and regulations
- Local data residency requirements
- Regional operational autonomy
- Currency and language localization

### Domain Types

The system supports two distinct domain types, each serving different roles in the field marketing ecosystem. All domains are stored in the `PTTN_DOMAIN` table within the PTTN database, with the `YN_GLOBAL` boolean field determining the domain type.

#### Global Domain
- **Role**: Field marketing organizer and campaign owner
- **Database Identification**: `YN_GLOBAL = 'Yes'` in the `PTTN_DOMAIN` table
- **Responsibilities**:
  - Project setup and configuration
  - Campaign management and oversight
  - Strategic planning and coordination
  - Performance monitoring and reporting
- **Stakeholders**: Clients seeking to acquire new donors, subscribers, or leads through field marketing
- **Business Impact**: Ultimate beneficiaries of field marketing efforts

#### Agency Domain
- **Role**: Field marketing executor and operations manager
- **Database Identification**: `YN_GLOBAL = 'No'` (or NULL) in the `PTTN_DOMAIN` table
- **Responsibilities**:
  - Tactical campaign execution
  - Team planning and coordination
  - Field operations management
  - Direct consumer acquisition activities
- **Stakeholders**: Service providers executing field marketing on behalf of clients
- **Business Impact**: Operational delivery of acquisition campaigns

### Multi-Domain Scenarios

#### Agency with Global Capabilities
When agencies manage both strategy and execution:
- **Dual Domain Setup**: Agency maintains both Global and Agency domains
- **Full Service Model**: Complete campaign lifecycle management
- **Common Use Case**: Large agencies providing end-to-end field marketing services

#### In-House Team Operations
When clients execute their own field marketing:
- **Client Domain Setup**: Client maintains both Global and Agency domains
- **Direct Control**: Complete oversight of strategy and execution
- **Internal Resources**: "In-house team" model instead of external agency relationship

## Inter-Domain Collaboration

### Authorization Framework

Global domains establish working relationships with Agency domains through a structured authorization process:

#### Domain Relationship Establishment
1. **Authorization Table**: `PTTN_SUB_DOMAIN` table manages Global-to-Agency relationships
2. **Permission Granting**: Global domain explicitly authorizes Agency domain access
3. **Campaign Access**: Authorization enables Agency access to specific campaigns
4. **Operational Enablement**: Agency can begin planning and execution activities

#### Special Relationships
- **Same Company Flag**: `YN_SPECIAL_RELATION` field identifies when Global and Agency domains belong to the same organization
- **Enhanced Trust**: Special relationships may enable expanded data sharing and operational permissions

### Shared Data Model

#### Dual-Domain Data Ownership
Certain data entities belong to both organizing (Global) and executing (Agency) domains:

**Examples of Shared Data:**
- **Teams**: Planning and execution information
- **Results**: Performance metrics and outcomes
- **Operational Data**: Field activity records

#### Data Visibility Controls
- **Global Domain Authority**: Organizing domain controls data visibility
- **Selective Sharing**: Global domain can hide portions of shared data from Agency domain
- **Data Ownership**: Ultimate data ownership remains with the Global domain
- **Business Justification**: Protects proprietary information while enabling operational collaboration

## User Management Architecture

### User Categories

The system supports two distinct user types, each optimized for different operational roles:

#### Application Users
- **Target Audience**: Office staff and administrative personnel
- **System Access**: Location Manager and Campaign Manager applications
- **Capabilities**:
  - Strategic planning and oversight
  - Campaign configuration and management
  - Reporting and analytics
  - Administrative functions
- **Security Model**: Comprehensive permission structure with granular access controls

#### Crew Members
- **Target Audience**: Field execution personnel
- **System Access**: Field mobile application exclusively
- **Domain Restriction**: Only exist within Agency domains
- **Capabilities**:
  - Field data collection
  - Real-time activity reporting
  - Consumer interaction management
  - Operational task execution

### Domain-Based User Isolation

- **Domain Binding**: All users are strictly bound to their respective domains
- **Multi-Domain Access**: Users requiring access to multiple domains maintain separate accounts per domain
- **Data Isolation**: User permissions and data access are scoped to their assigned domain

## Identity and Authentication

### Keycloak Integration

The system uses **Keycloak** as the primary identity provider for authentication and single sign-on capabilities:

#### Authentication Flow
- **Identity Provider**: Keycloak manages user authentication and session management
- **Account Linking**: Each Keycloak account is linked to a record in the `PERSON` table within the PTTN database
- **Multi-Account Support**: Single Keycloak identity can be associated with multiple application user or crew member accounts
- **Cross-Domain Authentication**: Keycloak enables seamless authentication across multiple domains

### Person-Based Identity Integration

#### Single Sign-On Architecture
- **Person Entity**: Aggregates multiple user accounts under a single identity
- **Login Consolidation**: Single login provides access to all associated accounts
- **Email-Based Merging**: Accounts are linked to persons based on email address matching

#### Username Conventions
- **Standard Users**: Username typically matches email address (`user_id` from person table)
- **Crew Members**: For crew members without email addresses, username follows pattern: `DOMAIN_CODE-MARKETING_CODE`

#### Account Management
- **Email Address Changes**: Automatic person association when email addresses are updated
- **Context Switching**: Users with multiple accounts can switch between domain contexts
- **Unified Experience**: Single identity across multiple operational contexts

### Application Context Management

#### Domain Context Switching
- **Application Perspective**: Campaign Manager and Location Manager operate from a single Application User context
- **Multi-Account Users**: Users can switch between different domain contexts as needed
- **Session Management**: Maintains clear separation between domain-specific sessions

## Authorization Model

User access rights are determined by role-specific authorization patterns that ensure appropriate access levels while maintaining security boundaries.

### Crew Member Authorization

#### Field Application Access
- **Self-Service Model**: Crew members access only their own data and perform actions on their own behalf
- **Shift-Based Access**: Field app access depends on active shift assignments
- **Daily Authorization**: Access requires presence in `CREW_MEMBER_SHIFT` table for the current day
- **Contextual Data Access**: Shift assignment determines accessible project and location information

#### Simplified Security Model
- **No Complex Permissions**: Crew members operate under a streamlined authorization model
- **Operational Focus**: Access rights optimized for field execution tasks
- **Data Scope**: Limited to information necessary for assigned activities

### Application User Authorization

#### Two-Tier Authorization Structure

##### 1. Office-Based Authorization
- **Project Access Control**: Determines which projects users can access
- **Office Assignment**: `OFFICE_AUTHORIZATION` table defines activated offices per user
- **Agency Domain Filtering**: In Agency domains, users see only projects authorized for their office
- **Geographic Scope**: Office authorization often aligns with geographic or operational boundaries

##### 2. Functional Authorization
- **Action Permissions**: `PTTN_User` table contains multiple `YN_` fields defining allowed actions
- **Granular Control**: Specific permissions for different system functions
- **Role-Based Access**: Permission combinations define effective user roles
- **Administrative Flexibility**: Permissions can be adjusted based on user responsibilities

#### Authorization Matrix
The combination of office authorization and functional permissions creates a comprehensive authorization matrix:

```
User Access = Office Authorization ∩ Functional Permissions ∩ Domain Scope
```

Where:
- **Office Authorization**: Determines accessible projects
- **Functional Permissions**: Defines allowed actions
- **Domain Scope**: Limits access to domain-specific data

## Data Architecture Implications

### Database Design Patterns

#### Domain Partitioning
- **Consistent Domain Fields**: All tenant-specific tables include domain identification
- **Query Filtering**: All queries automatically filter by user's authorized domains
- **Data Integrity**: Foreign key relationships respect domain boundaries
- **Performance Optimization**: Indexes include domain fields for efficient data access

#### Multi-Domain Data Handling
- **Shared Entity Management**: Special handling for entities owned by multiple domains
- **Visibility Controls**: Database-level enforcement of data visibility rules
- **Audit Trails**: Complete tracking of cross-domain data access and modifications

### Security Implementation

#### Row-Level Security
- **Automatic Filtering**: Database queries automatically apply domain-based filtering
- **Authorization Context**: Query execution includes user's domain authorization context
- **Data Leakage Prevention**: Impossible to access data outside authorized domains

#### Cross-Domain Operations
- **Controlled Sharing**: Explicit mechanisms for authorized cross-domain data access
- **Audit Requirements**: All cross-domain operations are logged and auditable
- **Permission Validation**: Multiple validation layers for cross-domain requests

## Operational Considerations

### Multi-Tenant Operations

#### Data Management
- **Backup and Recovery**: Single backup strategy covers all tenants
- **Maintenance Windows**: Coordinated maintenance affects all tenants simultaneously
- **Performance Monitoring**: System-wide performance impacts all tenants

#### Tenant Lifecycle
- **Onboarding**: New domain creation and configuration
- **Migration**: Moving tenants between geographic regions
- **Decommissioning**: Safe removal of tenant data while preserving audit trails

### Scalability Patterns

#### Horizontal Scaling
- **Read Replicas**: Domain-aware read replicas for geographic distribution
- **Caching Strategies**: Domain-specific caching layers
- **Load Distribution**: Intelligent routing based on domain characteristics

#### Performance Optimization
- **Index Strategy**: Domain-aware indexing for optimal query performance
- **Partitioning**: Table partitioning strategies considering domain distribution
- **Query Optimization**: Domain-scoped query patterns and optimization

## Integration Architecture

### API Design Patterns

#### Domain Context Propagation
- **Header-Based Context**: Domain information passed via HTTP headers
- **Authorization Validation**: Every API call validates domain authorization
- **Response Filtering**: API responses filtered based on domain permissions

#### Multi-Domain APIs
- **Cross-Domain Operations**: APIs supporting authorized cross-domain functionality
- **Context Switching**: APIs enabling users to switch between domain contexts
- **Aggregation Services**: APIs providing consolidated views across authorized domains

### Event-Driven Architecture

#### Domain-Scoped Events
- **Event Partitioning**: Events include domain context for proper routing
- **Cross-Domain Events**: Special handling for events affecting multiple domains
- **Event Filtering**: Subscribers receive only domain-relevant events

## Compliance and Governance

### Data Privacy
- **Geographic Compliance**: Domain-specific compliance with local data protection regulations
- **Data Residency**: Ensuring data remains within required geographic boundaries
- **User Consent**: Domain-specific consent management for user data

### Audit and Reporting
- **Cross-Domain Auditing**: Complete audit trails for multi-domain operations
- **Compliance Reporting**: Domain-specific reporting for regulatory requirements
- **Data Lineage**: Tracking data flow and transformation across domain boundaries

---

This domain architecture provides the foundation for secure, scalable multi-tenant operations while enabling flexible collaboration between organizations in the field marketing ecosystem.
