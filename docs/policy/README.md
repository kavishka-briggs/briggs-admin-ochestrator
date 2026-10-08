# 🏛️ Policy Documentation - SUPREME AUTHORITY

**🚨 CRITICAL**: This documentation has **SUPREME AUTHORITY** over all other Briggs System documentation.

**CANONICAL SOURCE**: ISO 27001 compliance and information security controls for the Briggs System.

## 🥇 **Documentation Supremacy**

**⚠️ POLICY SUPREMACY RULE**: When ANY conflict exists between this policy documentation and other documentation in the Briggs System, **POLICY WINS**.

### Authority Hierarchy
1. **🥇 SUPREME**: `docs/policy/` (THIS FOLDER) - Overrides everything
2. **🥈 ARCHITECTURAL**: Core architecture principles - Must comply with policy  
3. **🥉 STACK-SPECIFIC**: Implementation patterns - Must comply with policy + architecture
4. **📚 REFERENCE**: Supporting docs - Must comply with all above

**📖 See**: [`../documentation-hierarchy.md`](../documentation-hierarchy.md) for complete authority structure and conflict resolution.

## 🔐 **Overview**

This folder contains the complete ISO 27001 information security documentation structure for the Briggs System and its microservices architecture.

## 📁 **Documentation Structure**

### Core Documentation
- [`iso-security-policy.md`](iso-security-policy.md) - Complete security development policy
- [`iso-assessment-checklist.md`](iso-assessment-checklist.md) - **AI-optimized checklist for assessments**
- [`iso-controls-matrix.md`](iso-controls-matrix.md) - ISO 27001 controls mapping
- [`iso-quick-reference.md`](iso-quick-reference.md) - Quick access guide for developers

### Assessment Templates
- [`iso-assessment-template.md`](iso-assessment-template.md) - Template for new assessments
- [`iso-rfc-template.md`](iso-rfc-template.md) - Request for Change assessment template

## 🤖 **AI Agent Integration**

**For GitHub Copilot and AI Assistants:**

### Keywords for Discovery
- `ISO assessment`, `security assessment`, `information security`, `ISO 27001`
- `security checklist`, `compliance check`, `security controls`
- `RFC security review`, `security requirements`, `vulnerability assessment`

### Usage Patterns
```markdown
# When performing ISO assessments:
1. Always reference iso-assessment-checklist.md
2. Use iso-controls-matrix.md for control mapping
3. Check iso-security-policy.md for policy compliance
4. Use iso-quick-reference.md for implementation decisions

# For RFC security reviews:
1. Use iso-rfc-template.md as starting point
2. Apply iso-assessment-checklist.md point by point
3. Document findings in standardized format
```

## 🎯 **System Coverage**

### Briggs System Components
- **Core Infrastructure** - briggs-orchestrator, briggs-admin-ochestrator, briggs-gateway-api, auth (Keycloak), briggsbase
- **PTTN Microservices** - Projects, Onboarding, Crew, Planning, Forms APIs  
- **Frontend Modules** - Microfrontends using module federation (React + TypeScript)
- **System Components** - ClamAV security, CDC integration, File processing
- **Shared Infrastructure** - Deployment templates, design system, logging

### Development & Infrastructure
- **Internal Development Team** - All Briggs System development and maintenance
- **Cloud Infrastructure Provider** - Kubernetes platform and monitoring

### Cross-References

#### Authentication Architecture
- **CRITICAL**: All security assessments must verify alignment with [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md)
- Security controls must support KrakenD-only authentication pattern

#### Code Review Integration
- ISO assessments integrate with [`../../.github/copilot-code-review-checklist.md`](../../.github/copilot-code-review-checklist.md)
- Security findings feed into automated code review workflows

#### Stack Documentation
- Security requirements apply across all [`../stack/`](../stack/) technologies
- Each stack component has security-specific guidance

## 📋 **Assessment Process**

### When to Perform ISO Assessment
1. **New system development** - Complete assessment required
2. **Fundamental changes** - Major feature additions or architecture changes
3. **RFC evaluation** - Security impact assessment for changes
4. **Compliance audits** - Periodic compliance verification
5. **Incident response** - Post-incident security review

### Assessment Workflow
1. **Initiate**: Use [`iso-assessment-template.md`](iso-assessment-template.md)
2. **Execute**: Follow [`iso-assessment-checklist.md`](iso-assessment-checklist.md) point by point
3. **Document**: Record findings using standardized format
4. **Review**: Management and Functioneel Beheerder approval
5. **Implement**: Apply remediation measures
6. **Monitor**: Ongoing compliance verification

## 🚨 **Critical Security Requirements**

### Non-Negotiable Controls
- ✅ **Encryption at rest** (TDE for PTTN databases, database-level encryption for system databases)
- ✅ **Two-factor authentication** (All frontend applications via Keycloak MFA)
- ✅ **Audit logging** (User interactions via briggslogging, infrastructure via Azure/Prometheus/Grafana)
- ✅ **Access control** (Domain-based permissions, least privilege)
- ✅ **Vulnerability management** (Regular patching and updates across Kubernetes platform)

### Architecture Compliance
- ✅ **KrakenD authentication** - Only gateway validates JWT tokens
- ✅ **Environment separation** - Development, Test, Production isolation across Kubernetes
- ✅ **Version control** - All code changes tracked via GitHub with automated workflows
- ✅ **Change management** - Formal RFC and approval process

## 📞 **Contacts & Responsibilities**

### Key Roles
- **Functioneel Beheerder** - Security assessment approval authority
- **Management Team** - Strategic security decisions
- **Internal Development Team** - Implementation and compliance
- **Cloud Infrastructure Provider** - Monitoring and incident response

### Escalation Path
1. **Technical Issues** → Internal Development Team → Functioneel Beheerder
2. **Security Incidents** → Cloud Provider → Functioneel Beheerder → Management Team
3. **Compliance Questions** → Functioneel Beheerder → External Auditor
