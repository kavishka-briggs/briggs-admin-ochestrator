# ISO 27001 Assessment Template

**PROJECT ASSESSMENT TEMPLATE**: Use this template for new system assessments and RFC security reviews.

---

## 📋 **Assessment Information**

**Project/RFC ID**: `_____________________`  
**Assessment Date**: `_____________________`  
**Assessor**: `_____________________`  
**Approver**: `_____________________`  

**System/Component**: `_____________________`  
**Change Type**: [ ] New Development [ ] Major Change [ ] Minor Change [ ] Incident Review  
**Business Impact**: [ ] Low [ ] Medium [ ] High [ ] Critical  

---

## 🎯 **Scope Definition**

### Components Affected
- [ ] **Frontend Applications**: `_____________________`
- [ ] **Backend Services**: `_____________________`
- [ ] **Databases**: `_____________________`
- [ ] **Integration Points**: `_____________________`
- [ ] **Infrastructure**: `_____________________`

### Data Classification
- [ ] **Public Data** - No special protection required
- [ ] **Internal Data** - Company internal information
- [ ] **Confidential Data** - Sensitive business information
- [ ] **Personal Data** - GDPR-protected personal information

### User Groups Affected
- [ ] **End Users** - Field Marketing Suite users
- [ ] **Administrators** - System administrators
- [ ] **Clients** - Customer organization users
- [ ] **Partners** - External integration partners

---

## 🔐 **Security Assessment Checklist**

> **INSTRUCTIONS**: Complete each section using the detailed [`iso-assessment-checklist.md`](iso-assessment-checklist.md). Reference line numbers and provide specific evidence.

### Critical Security Controls *(Must be 100% compliant)*

#### Authentication Architecture *(CRITICAL)*
- [ ] **KrakenD Gateway Only**: Verified NO individual service JWT validation
- [ ] **Header-Based Context**: Services extract user context from KrakenD headers only
- [ ] **No Direct Authentication**: Services do NOT implement AddAuthentication() or AddJwtBearer()

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ❌ Critical Violation  

#### Personal Data Protection *(CRITICAL)*
- [ ] **Data Mapping**: Personal data identified and classified
- [ ] **Encryption at Rest**: TDE for databases, additional encryption for personal data
- [ ] **GDPR Compliance**: Legal basis, consent, subject rights implemented
- [ ] **Data Minimization**: Only necessary personal data collected

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ❌ Critical Violation  

#### Access Control *(CRITICAL)*
- [ ] **Role-Based Access**: Proper RBAC implementation
- [ ] **Principle of Least Privilege**: Users have minimum necessary access
- [ ] **Multi-Factor Authentication**: 2FA for Campaign Manager & Location Manager
- [ ] **Tenant Isolation**: Multi-tenant data properly segregated

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ❌ Critical Violation  

### High Priority Controls

#### Logging and Monitoring *(HIGH)*
- [ ] **User Activity Logging**: All user actions logged with timestamps
- [ ] **Security Event Logging**: Security events and exceptions logged
- [ ] **Log Protection**: Logs protected against tampering
- [ ] **Log Analysis**: Regular review and analysis procedures

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ⚠️ Minor Issues [ ] ❌ Major Issues  

#### Vulnerability Management *(HIGH)*
- [ ] **Regular Scanning**: Automated vulnerability scanning
- [ ] **Patch Management**: Timely security patch application
- [ ] **Dependency Management**: Third-party components kept current
- [ ] **Security Testing**: Regular penetration testing

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ⚠️ Minor Issues [ ] ❌ Major Issues  

#### Secure Development *(HIGH)*
- [ ] **Environment Separation**: Development, Test, Production isolated
- [ ] **Code Reviews**: Security-focused code reviews conducted
- [ ] **Test Data Management**: No production data in test environments
- [ ] **Change Management**: Formal RFC and approval processes

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ⚠️ Minor Issues [ ] ❌ Major Issues  

### Supplier Management *(if applicable)*

#### Third-Party Development *(HIGH)*
- [ ] **Security Agreements**: Security requirements in supplier contracts
- [ ] **Development Oversight**: Active supervision of outsourced development
- [ ] **Security Testing**: Security testing of all deliverables
- [ ] **Confidentiality**: NDAs and confidentiality agreements in place

**Evidence**: `_____________________`  
**Status**: [ ] ✅ Compliant [ ] ⚠️ Minor Issues [ ] ❌ Major Issues [ ] 🚫 Not Applicable  

---

## 📊 **Risk Assessment**

### Identified Risks
1. **Risk #1**: `_____________________`
   - **Impact**: [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Likelihood**: [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Mitigation**: `_____________________`

2. **Risk #2**: `_____________________`
   - **Impact**: [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Likelihood**: [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Mitigation**: `_____________________`

3. **Risk #3**: `_____________________`
   - **Impact**: [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Likelihood**: [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Mitigation**: `_____________________`

### Overall Risk Rating
- [ ] **Low Risk** - Minor issues, acceptable for deployment
- [ ] **Medium Risk** - Some issues, mitigation plan required
- [ ] **High Risk** - Significant issues, must be addressed before deployment
- [ ] **Critical Risk** - Severe issues, deployment blocked until resolved

---

## ✅ **Findings and Recommendations**

### Critical Findings *(Must be resolved immediately)*
1. `_____________________`
2. `_____________________`
3. `_____________________`

### High Priority Findings *(Resolve within 1 week)*
1. `_____________________`
2. `_____________________`
3. `_____________________`

### Medium Priority Findings *(Resolve within 1 month)*
1. `_____________________`
2. `_____________________`
3. `_____________________`

### Recommendations for Future Improvements
1. `_____________________`
2. `_____________________`
3. `_____________________`

---

## 📅 **Remediation Plan**

### Immediate Actions *(Within 24 hours)*
- [ ] **Action 1**: `_____________________`
  - **Owner**: `_____________________`
  - **Due Date**: `_____________________`
  - **Status**: [ ] Not Started [ ] In Progress [ ] Complete

- [ ] **Action 2**: `_____________________`
  - **Owner**: `_____________________`
  - **Due Date**: `_____________________`
  - **Status**: [ ] Not Started [ ] In Progress [ ] Complete

### Short Term Actions *(Within 1 week)*
- [ ] **Action 1**: `_____________________`
  - **Owner**: `_____________________`
  - **Due Date**: `_____________________`
  - **Status**: [ ] Not Started [ ] In Progress [ ] Complete

- [ ] **Action 2**: `_____________________`
  - **Owner**: `_____________________`
  - **Due Date**: `_____________________`
  - **Status**: [ ] Not Started [ ] In Progress [ ] Complete

### Medium Term Actions *(Within 1 month)*
- [ ] **Action 1**: `_____________________`
  - **Owner**: `_____________________`
  - **Due Date**: `_____________________`
  - **Status**: [ ] Not Started [ ] In Progress [ ] Complete

---

## 🎯 **Approval and Sign-off**

### Technical Review
- **Reviewer**: `_____________________`
- **Review Date**: `_____________________`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected
- **Comments**: `_____________________`

### Security Review
- **Security Officer**: `_____________________`
- **Review Date**: `_____________________`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected
- **Comments**: `_____________________`

### Final Approval
- **Functioneel Beheerder**: `_____________________`
- **Approval Date**: `_____________________`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected
- **Conditions**: `_____________________`

### Management Approval *(if required)*
- **Management Representative**: `_____________________`
- **Approval Date**: `_____________________`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected
- **Comments**: `_____________________`

---

## 📋 **Follow-up and Monitoring**

### Monitoring Plan
- **Monitoring Frequency**: [ ] Daily [ ] Weekly [ ] Monthly [ ] Quarterly
- **Key Metrics**: `_____________________`
- **Monitoring Owner**: `_____________________`

### Review Schedule
- **Next Review Date**: `_____________________`
- **Review Type**: [ ] Full Assessment [ ] Partial Review [ ] Compliance Check
- **Review Owner**: `_____________________`

### Documentation Updates
- [ ] **Update Security Documentation**: `_____________________`
- [ ] **Update Procedures**: `_____________________`
- [ ] **Training Requirements**: `_____________________`

---

## 🔗 **References and Documentation**

### Assessment Documentation
- [`iso-assessment-checklist.md`](iso-assessment-checklist.md) - Complete assessment checklist
- [`iso-security-policy.md`](iso-security-policy.md) - Security policy reference
- [`iso-controls-matrix.md`](iso-controls-matrix.md) - Controls compliance matrix

### Related Documentation
- [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md) - Authentication architecture
- [`../../.github/copilot-code-review-checklist.md`](../../.github/copilot-code-review-checklist.md) - Code review integration
- Management Handbook Section 2.2 - Change Management Procedures

### External Standards
- ISO 27001:2022 - Information Security Management Systems
- GDPR - General Data Protection Regulation
- OWASP - Open Web Application Security Project

---

**Assessment Completed**: `_____________________`  
**Assessment Status**: [ ] Complete [ ] In Progress [ ] Pending Approval  
**Next Action**: `_____________________`
