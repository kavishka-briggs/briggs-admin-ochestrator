# ISO 27001 Security Policy

**CANONICAL SOURCE**: Complete information security development policy for Briggs + Walker Field Marketing Suite.

> **AI OPTIMIZATION**: This document provides the complete security policy framework. AI agents should reference this for policy compliance verification and implementation guidance.

---

## 🎯 **1. Purpose and Scope**

### Policy Objective
This protocol helps Briggs + Walker (B+W) map information security aspects for all systems and applications developed, modified, and deployed on behalf of B+W. This policy covers the complete "Field Marketing Suite" and supporting infrastructure.

### Risk Classification
All systems have been assessed for criticality in terms of **Availability**, **Integrity**, and **Confidentiality** through comprehensive risk analysis. Associated control measures are documented in this protocol.

### System Scope

#### Briggs System Components
| Component Category | Components | Technology | Environment |
|-------------------|------------|------------|-------------|
| **Core Infrastructure** | briggs-orchestrator (Shell), briggs-admin-ochestrator (Admin Shell), briggsbase (Config), briggs-gateway-api (KrakenD), auth (Keycloak), briggs-modules-authentication (alias: module-authenticator) | React/Vite, .NET 9, KrakenD/Go, Keycloak/Java, React | Dev/Test/Prod |
| **PTTN Microservices** | pttn-projectsapi, pttn-onboarding-api, pttn-crewapi, pttn-planningapi (docs alias pttn-planning-api), pttn-formsapi (docs alias pttn-forms-api), pttn-authapi | .NET 10 + SQL Server (pttn-planningapi remains .NET 9) | Dev/Test/Prod |
| **System Components** | clamav-api (Security), cdc-pttn (Integration, .NET 9), cdc-agencysuite (Integration, .NET 10), pttn-address-projection (Address read model), file-upload-api (Processing, .NET 9), field-apis (Field helpers, .NET 10) | clamav-api: .NET 10 + ClamAV; field-apis: .NET 10; cdc-agencysuite / pttn-address-projection: .NET 10; cdc-pttn / file-upload-api: .NET 9; CDC and projection workers use Azure Functions | Dev/Test/Prod |
| **Kickstarter Modules** | module-onboarding, module-projectwizard, module-dashboardbasic (GitHub: modules-dashboardbasic), module-projectbasic, modules-crewbasic (plugin_id module-crewbasic), modules-forms (plugin_id module-forms) | React + Module Federation | Dev/Test/Prod |
| **Extended Modules** | modules-quartercompletion monorepo (plugin_id module-quartercompletion; backend + frontend) | .NET 9 + React | Dev/Test/Prod |
| **Shared Infrastructure** | plugin-deploy (Helm + reusable workflows), briggsdesignsystem (UI), briggslogging (Audit), Koppelplatform (PHP/Laravel integrator), DWH (PHP/Laravel warehouse) | Helm/K8s, React/Storybook, .NET 9, PHP 8.5 / Laravel 13 (Koppelplatform), PHP 8.3 / Laravel 10 (DWH) | Dev/Test/Prod |

#### Multi-Factor Authentication (MFA) Implementation
- **Frontend Applications**: All React-based microfrontends use Keycloak for MFA
- **Authentication Flow**: Keycloak provides centralized 2FA with authenticator apps (Microsoft, Google)
- **Coverage**: briggs-orchestrator, briggs-admin-ochestrator, briggs-modules-authentication, and all frontend modules require MFA
- **Backend Services**: Protected via KrakenD gateway authentication (inherits MFA from frontend flow)

#### System Architecture Terminology
- **"Core Infrastructure"**: Central system services (orchestrator, gateway, auth, config)
- **"PTTN Microservices"**: Business logic APIs for field marketing operations
- **"System Components"**: Security, integration, and processing services
- **"Frontend Modules"**: React microfrontends with module federation
- **"Shared Infrastructure"**: Common deployment and design resources

---

## 🔐 **2. Secure Development Policy**

### Environment Management

#### Development Environments
- **Core Infrastructure & PTTN Services**: Development → Test → Production
- **System Components & Modules**: Development → Test → Production  
- **Environment Isolation**: Each environment completely separated with independent access controls
- **Container Orchestration**: Kubernetes-based deployment with Helm charts

#### Testing Requirements
- **Independent Testing**: Software testing performed by different person than developer
- **Core Infrastructure & PTTN Services**: B+W tests all microservices and frontend modules
- **System Components**: Automated testing with manual validation for security components
- **Integration Testing**: End-to-end testing across module federation and API gateways

#### Change Management
- **Process Reference**: Management handbook section 2.2
- **Documentation**: All changes documented and tracked
- **Approval**: Formal approval process for all production changes

### Encryption Standards

#### Data at Rest Encryption
- **PTTN Databases**: Transparent Data Encryption (TDE) enabled for all business data
  - All data including personal data encrypted at disk level
  - Applies to databases, backups, and logs
- **System Databases**: Database-level encryption for briggsbase, plugindb, and logging systems
  - Additional layer beyond TDE for sensitive configuration and audit data

#### Data in Transit
- **API Communications**: All API calls use HTTPS/TLS encryption
- **Client Communications**: All user-facing interfaces use HTTPS
- **Internal Communications**: Encrypted channels between system components

### Version Control

#### Source Code Management
- **Briggs System**: GitHub version control system for all repositories
- **Repository Structure**: Distributed architecture with standardized repository templates
- **Rollback Capability**: Ability to rollback to any previous version across all services
- **Change Tracking**: Complete audit trail of all code changes with automated workflows

#### Deployment Management
- **Automated Deployment**: Consistent deployment processes
- **Version Tagging**: Clear version identification for all releases
- **Rollback Procedures**: Tested rollback procedures for all deployments

---

## 🚪 **3. Authorization and Access Control**

### Authentication Architecture *(CRITICAL)*

> **FUNDAMENTAL PRINCIPLE**: Only KrakenD gateway validates JWT tokens. Individual services extract user context from KrakenD headers.

#### KrakenD Gateway Authentication
- **Centralized Authentication**: KrakenD handles ALL JWT token validation
- **Token Source**: Keycloak identity provider
- **Header Propagation**: KrakenD propagates user context via headers (`x-sub`, `x-user-roles`, etc.)
- **Service Pattern**: Services read user context from headers, no direct JWT validation

#### Service Implementation Requirements
- ❌ **PROHIBITED**: Services must NOT implement JWT validation
- ❌ **PROHIBITED**: No `AddAuthentication()` or `AddJwtBearer()` in services
- ✅ **REQUIRED**: Extract user context from KrakenD headers
- ✅ **REQUIRED**: Implement business-level authorization based on user context

### Administrative Access

#### System Administrator Access
- **B+W Staff**: Application administrator rights on all Briggs System components
- **Development Team**: Limited administrative access for maintenance tasks only
- **Authorization Requirement**: External partner access requires specific authorization from Management Team or Functioneel Beheerder
- **Activity Monitoring**: All administrative activities logged and monitored across all system components

#### Client User Management
- **Self-Service**: Clients can create/deactivate users within their tenant
- **Scope Limitation**: Client users limited to their own modules and data
- **Permission Hierarchy**: Client users have fewer rights than B+W administrative accounts
- **Responsibility**: Clients responsible for their own user lifecycle management

### Password and Authentication Standards

#### Password Requirements *(All Systems)*
```
Minimum Length: 8 characters
Maximum Length: 128 characters
Required Elements:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character
Expiration: 6 months
Lockout: After multiple failed attempts
```

#### Two-Factor Authentication (2FA)
- **Campaign Manager**: 2FA mandatory for all users
- **Location Manager**: 2FA mandatory for all users
- **Implementation**: Authenticator app or third-party 2FA provider (Microsoft, Google)
- **Purpose**: Ensure personal data always protected with multi-factor authentication

#### System-Specific Access Controls

##### Briggs Orchestrator & Frontend Modules
- **Primary Authentication**: Keycloak SSO with MFA mandatory for all users
- **Multi-Factor Authentication**: Authenticator app (Microsoft, Google) required for all frontend access
- **Module Federation Security**: Centralized authentication propagated to all microfrontend modules
- **Domain-Based Access**: Users can only access modules and data within their assigned domain/organization

##### PTTN Microservices
- **Gateway Authentication**: All API access controlled via KrakenD gateway with JWT validation
- **Header-Based Authorization**: Services extract user context from gateway headers (x-sub, x-user-roles)
- **Domain Isolation**: API responses filtered by user's domain assignment
- **Activity Validation**: System validates user permissions before allowing data access

##### System Components (ClamAV, File Upload, CDC)
- **Service-to-Service Authentication**: Internal service communication via gateway authentication
- **API Security**: File upload and processing services protected via B+W-issued API tokens
- **Automated Security**: ClamAV antivirus scanning for all uploaded content
- **Monitoring Integration**: All system components integrate with centralized logging

##### KrakenD Gateway (API Access Control)
- **Centralized Gateway**: All external API access controlled via KrakenD gateway
- **JWT Token Validation**: Gateway handles all authentication token validation from Keycloak
- **Header Propagation**: User context propagated to backend services via secure headers
- **API Security**: Rate limiting, CORS, and access control implemented at gateway level
- **IP Whitelisting**: Additional IP address whitelist for sensitive API endpoints

---

## 📊 **4. Monitoring and Logging**

### User Activity Logging

#### Web Application Logging
- **Systems Covered**: briggs-orchestrator, briggs-admin-ochestrator, and all frontend modules for user interaction logging
- **Log Content**: User actions, timestamps, source locations, frontend interactions
- **Centralized Logging**: briggslogging service provides unified audit trail for user activities
- **Purpose**: Enable investigation of who performed what actions when and from where

#### Database Change Tracking
- **Systems**: All PTTN microservices, briggsbase, and plugindb systems
- **Mechanism**: Entity Framework change tracking and briggslogging service integration
- **Coverage**: All personal data modifications tracked across all databases
- **Capability**: Complete audit trail of data changes with user attribution via gateway headers

#### API Access Logging
- **System**: KrakenD gateway and all backend microservices
- **Log Content**: System identification, IP addresses, data requests, response times
- **Visibility**: Complete record of which systems access what data through centralized gateway
- **Security**: Enables detection of unauthorized access attempts and API abuse

### Infrastructure Monitoring

#### Briggs System Infrastructure Monitoring
- **Kubernetes Platform**: Azure Log Services, Prometheus, and Grafana for container orchestration monitoring
- **Database Monitoring**: Azure Log Services for database performance and health monitoring
- **Application Monitoring**: Automated sensors with threshold-based alerting for all services
- **Response**: Direct contact with Functioneel Beheerder when thresholds breached
- **Coverage**: System availability, performance, security metrics, and container health

#### Gateway and Service Monitoring
- **KrakenD Gateway**: Comprehensive API gateway monitoring with traffic analysis via Prometheus/Grafana
- **Microservices Health**: Individual service health checks and dependency monitoring
- **Module Federation**: Frontend module loading and performance monitoring
- **Cloud Provider**: Infrastructure component health logging (hardware, network, storage)
- **Scope**: API response times, error rates, authentication failures, and service dependencies

### Log Management

#### Monitoring Architecture Overview
- **User Interaction Logging**: briggslogging service for frontend application user activities
- **Infrastructure Monitoring**: Azure Log Services, Prometheus, and Grafana for Kubernetes and database monitoring
- **Cloud Provider Logging**: Infrastructure component health only (hardware, network, storage)
- **Application Performance**: Azure monitoring for microservices performance and health

#### Log Retention and Protection
- **Retention**: Logs retained per regulatory and business requirements
- **Protection**: Logs protected against tampering and unauthorized access
- **Analysis**: Regular review and analysis of security-relevant events
- **Correlation**: Cross-system log correlation for security investigations using centralized monitoring stack

---

## ⚙️ **5. Secure Development Principles**

### Core Engineering Principles

#### 1. Encryption by Design
- **Requirement**: All new applications must encrypt stored personal data
- **Implementation**: Database-level encryption for all system databases, TDE for PTTN databases
- **Scope**: All personal data at rest must be encrypted across all Briggs System components

#### 2. Personal Account Management
- **Frontend Applications**: Personal accounts with unique email addresses mandatory for all Keycloak users
- **2FA Implementation**: All personal accounts protected with two-factor authentication via Keycloak
- **Account Sharing Prevention**: Technical and policy controls prevent account sharing across all frontend modules
- **Service Authentication**: Backend services use service-to-service authentication via gateway headers
- **Migration Strategy**: Active effort to eliminate any remaining shared account situations

#### 3. Input Validation
- **Client-Side Validation**: User interface validation for immediate feedback
- **Server-Side Validation**: Authoritative validation on server side
- **Purpose**: Prevent data corruption and maintain data integrity
- **Coverage**: All user input fields validated at both levels
- **ISO Standards Compliance**: All APIs must use ISO standardized data formats (see `../api-development-standards.md`)

#### 3.1. Mandatory ISO Data Format Standards
- **Country Codes**: ISO 3166-1 alpha-2 format (e.g., "NL", "BE", "FR") - MANDATORY
- **Language Codes**: ISO 639-1 format (e.g., "en", "nl", "fr") - MANDATORY  
- **Currency Codes**: ISO 4217 format (e.g., "EUR", "USD", "GBP") - MANDATORY
- **Date/Time**: ISO 8601 format with timezone information - MANDATORY
- **Validation**: All ISO standards must be validated at both client and server levels

#### 4. Incremental Change Management
- **Granular Changes**: Changes requested and documented individually
- **Independent Testing**: Each change tested separately
- **Controlled Deployment**: Changes deployed to production individually
- **Short Release Cycles**: Minimize impact and complexity of production changes

#### 5. Technology Stack Optimization
- **Modern Technology**: Investigate new technology stacks when possible
- **Legacy Constraints**: Existing systems constrained by previous technology choices
- **Security Benefits**: New technologies evaluated for security improvements

#### 6. Qualified Personnel
- **Partner Relationships**: Durable, long-term relationships with development partners
- **Low Turnover**: Minimal developer turnover ensures continuity
- **Expertise**: Experienced developers familiar with security requirements

#### 7. Minimum Viable Product (MVP) Approach
- **Minimal Functionality**: Implement only necessary features
- **Reduced Attack Surface**: Fewer features mean fewer security risks
- **Data Minimization**: Store only data necessary for intended purpose
- **Purpose Limitation**: No data collection beyond stated purpose

#### 8. Security Assessment Integration
- **Fundamental Changes**: Security checklist required for major changes
- **RFC Process**: Request for Change includes security assessment
- **Approval Authority**: Functioneel Beheerder determines assessment requirements

---

## ✅ **6. Security Assessment Framework**

### When Assessment Required

#### Mandatory Assessment Scenarios
- **New System Development**: Complete security assessment required
- **Fundamental Architecture Changes**: Major modifications to existing systems
- **New Integration Points**: Additional external system connections
- **Data Handling Changes**: Modifications to personal data processing
- **Technology Stack Changes**: Introduction of new technologies or frameworks

#### Assessment Scope Determination
- **Minor Changes**: Small RFC or non-critical adjustments (assessment optional)
- **Major Changes**: Significant functionality or architecture modifications (assessment required)
- **Authority**: Functioneel Beheerder determines assessment requirement during RFC approval

### Assessment Process

#### Standard Development (Internal Team)
- **Simplified Process**: Some checklist elements covered by established internal procedures
- **Pre-Agreed Controls**: Standard security measures apply automatically across all Briggs System components
- **Reduced Documentation**: Focus on change-specific security aspects and component interactions

#### Third-Party Development
- **Complete Assessment**: Full security checklist must be completed
- **No Assumptions**: All security controls must be verified
- **Enhanced Documentation**: Comprehensive security assessment required

#### Documentation Storage
- **Location**: Google Drive management system, chapter 2.02
- **Retention**: Permanent retention for audit and compliance purposes
- **Access Control**: Restricted access to authorized personnel only

### Example Assessment Criteria

#### Technical Security Controls
- **Vulnerability Management**: Version control, patching, hardening
- **Access Control**: Strong passwords, two-factor authentication
- **Monitoring**: Activity logging, exception tracking, security event monitoring
- **Data Protection**: Personal data encryption, backup protection, log security
- **Clock Synchronization**: Unified time reference for log correlation

#### Application-Specific Controls
- **Network Security**: Protection against fraud, contract disputes, unauthorized disclosure
- **Transaction Security**: Incomplete transfer prevention, routing integrity, message protection
- **Change Management**: Formal change control procedures
- **Platform Assessment**: Impact evaluation when operating platforms change
- **Secure Engineering**: Application of secure system design principles
- **Security Testing**: Comprehensive security testing during development
- **Test Data Management**: Appropriate test data selection and protection

#### Third-Party Development Controls
- **Supplier Agreements**: Security aspects in vendor contracts
- **Supply Chain Security**: ICT supply chain security management
- **Confidentiality Agreements**: NDAs reflecting organizational needs
- **Development Oversight**: Supervision and monitoring of outsourced development
- **Service Monitoring**: Regular assessment of supplier service quality

---

## 📞 **7. Roles and Responsibilities**

### Key Roles

#### Functioneel Beheerder
- **Security Assessment Authority**: Approves all security assessments
- **RFC Approval**: Authorizes Request for Change implementations
- **Incident Response**: Primary contact for security incidents
- **Policy Compliance**: Ensures policy adherence across all systems

#### Management Team
- **Strategic Oversight**: High-level security strategy and policy approval
- **External Partner Authorization**: Approves external partner access requests
- **Budget Authority**: Security investment and resource allocation decisions
- **Escalation Point**: Final authority for security-related decisions

#### Development Partners

##### Internal Development Team (Briggs System)
- **Development Responsibility**: Secure development of all Briggs System components
- **Security Implementation**: Apply security controls per established policies and procedures
- **Testing Support**: Comprehensive testing across all system components and integrations
- **Maintenance**: Ongoing security maintenance, updates, and monitoring

#### Infrastructure Partners

##### Cloud Infrastructure Provider
- **Infrastructure Component Health**: Infrastructure component health logging (hardware, network, storage)
- **Infrastructure Monitoring**: 24/7 infrastructure monitoring (not application logging)
- **Incident Response**: First-line response to infrastructure and platform issues
- **Escalation**: Direct communication with Functioneel Beheerder for critical issues
- **Service Management**: Infrastructure service level management and capacity planning

### Escalation Procedures

#### Technical Issues
1. **Detection**: Automated monitoring or user report
2. **Initial Response**: Development partner or Intercept
3. **Escalation**: Functioneel Beheerder if not resolved
4. **Management Escalation**: Management Team for business-critical issues

#### Security Incidents
1. **Immediate Response**: Infrastructure partner (Intercept) or detection system
2. **Notification**: Immediate notification to Functioneel Beheerder
3. **Assessment**: Security impact assessment and containment
4. **Management Notification**: Management Team for significant incidents
5. **External Notification**: Regulatory notifications if required

#### Compliance Issues
1. **Identification**: Internal audit or external assessment
2. **Assessment**: Functioneel Beheerder evaluates compliance gap
3. **Remediation Planning**: Develop corrective action plan
4. **Management Approval**: Management Team approves remediation approach
5. **Implementation**: Execute corrective actions with monitoring

---

## 🔗 **8. Related Documentation**

### Internal References
- [`iso-assessment-checklist.md`](iso-assessment-checklist.md) - Detailed assessment checklist
- [`iso-controls-matrix.md`](iso-controls-matrix.md) - ISO 27001 controls mapping
- [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md) - Authentication architecture
- [`../api-development-standards.md`](../api-development-standards.md) - **MANDATORY ISO data format standards for API development**
- Management Handbook Section 2.2 - Change Management Procedures

### External Standards
- **ISO 27001:2022** - Information Security Management Systems
- **GDPR** - General Data Protection Regulation
- **SOC 2** - Service Organization Control 2
- **Industry Best Practices** - OWASP, NIST Cybersecurity Framework

### Integration Points
- [`../../.github/copilot-code-review-checklist.md`](../../.github/copilot-code-review-checklist.md) - Code review security integration
- [`../stack/`](../stack/) - Technology-specific security guidance
- [`../databases/`](../databases/) - Database security controls

---

**Document Version**: 3.0  
**Last Updated**: June 2025  
**Next Review**: December 2025  
**Owner**: Functioneel Beheerder  
**Approved By**: Management Team
