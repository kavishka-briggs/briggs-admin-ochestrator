# ISO 27001 RFC Assessment Template

**REQUEST FOR CHANGE SECURITY ASSESSMENT**: Simplified template for RFC security evaluation.

---

## 📋 **RFC Information**

**RFC ID**: `_____________________`  
**RFC Title**: `_____________________`  
**Assessment Date**: `_____________________`  
**Assessor**: `_____________________`  

**Change Type**: [ ] Feature Addition [ ] Bug Fix [ ] Configuration Change [ ] Infrastructure Change  
**Risk Level**: [ ] Low [ ] Medium [ ] High [ ] Critical  

---

## 🎯 **Change Summary**

### Description
`_____________________`

### Systems Affected
- [ ] **Frontend**: `_____________________`
- [ ] **Backend Services**: `_____________________`
- [ ] **Database**: `_____________________`
- [ ] **Infrastructure**: `_____________________`
- [ ] **Third-Party Integrations**: `_____________________`

### Data Handling Changes
- [ ] **No data changes**
- [ ] **New data collection**: `_____________________`
- [ ] **Modified data processing**: `_____________________`
- [ ] **Personal data involved**: `_____________________`

---

## 🔐 **Security Assessment**

> **CRITICAL**: All authentication changes must be reviewed against KrakenD-only pattern

### Authentication Architecture *(CRITICAL)*
- [ ] **No Authentication Changes**: RFC does not affect authentication
- [ ] **KrakenD Configuration**: Changes only to KrakenD gateway configuration
- [ ] **Service Context Extraction**: Changes to how services read user context from headers
- [ ] **⚠️ JWT Validation Added**: SERVICE MUST NOT VALIDATE JWT TOKENS

**Assessment**: [ ] ✅ Compliant [ ] ❌ Critical Violation  
**Details**: `_____________________`

### Personal Data Protection
- [ ] **No Personal Data**: RFC does not involve personal data
- [ ] **Existing Personal Data**: Uses existing personal data with same protection
- [ ] **New Personal Data**: New personal data collection with proper encryption
- [ ] **Modified Personal Data**: Changes to personal data handling

**Encryption Verified**: [ ] ✅ Yes [ ] ❌ No [ ] 🚫 N/A  
**GDPR Impact**: [ ] None [ ] Minor [ ] Significant  

### ISO Data Format Standards *(MANDATORY)*
- [ ] **No Data Format Changes**: RFC does not affect data formats
- [ ] **Country Codes**: Uses ISO 3166-1 alpha-2 format (e.g., "NL", "BE", "FR")
- [ ] **Language Codes**: Uses ISO 639-1 format (e.g., "en", "nl", "fr")
- [ ] **Currency Codes**: Uses ISO 4217 format (e.g., "EUR", "USD", "GBP")
- [ ] **Date/Time**: Uses ISO 8601 format with timezone information

**ISO Compliance**: [ ] ✅ Compliant [ ] ❌ Violation [ ] 🚫 N/A  
**Validation**: [ ] ✅ Client & Server [ ] ⚠️ Partial [ ] ❌ Missing  

### Access Control Changes
- [ ] **No Access Changes**: RFC does not affect access controls
- [ ] **New Permissions**: New permission types added
- [ ] **Modified Roles**: Existing roles modified
- [ ] **New User Types**: New user categories added

**2FA Requirements**: [ ] ✅ Maintained [ ] ⚠️ Bypassed [ ] 🚫 N/A  

### Logging and Monitoring
- [ ] **No Logging Changes**: RFC does not affect logging
- [ ] **Enhanced Logging**: Additional logging added
- [ ] **Modified Logging**: Existing logging changed
- [ ] **New Events**: New security events to log

**Security Event Coverage**: [ ] ✅ Complete [ ] ⚠️ Partial [ ] ❌ Missing  

---

## 📊 **Risk Assessment**

### Security Risks
1. **Authentication Risk**: [ ] None [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Details**: `_____________________`

2. **Data Protection Risk**: [ ] None [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Details**: `_____________________`

3. **Access Control Risk**: [ ] None [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Details**: `_____________________`

4. **Integration Risk**: [ ] None [ ] Low [ ] Medium [ ] High [ ] Critical
   - **Details**: `_____________________`

### Overall Risk Rating
- [ ] **Low** - Standard RFC approval process
- [ ] **Medium** - Additional security review recommended
- [ ] **High** - Detailed security assessment required
- [ ] **Critical** - RFC blocked until security issues resolved

---

## ✅ **Security Checklist**

### Development Standards
- [ ] **Secure Coding**: Follows documented secure coding standards
- [ ] **Input Validation**: Client-side and server-side validation implemented
- [ ] **Error Handling**: Secure error handling that doesn't leak information
- [ ] **Code Review**: Security-focused code review completed

### Testing Requirements
- [ ] **Security Testing**: Security testing performed during development
- [ ] **Test Data**: No production data used in test environments
- [ ] **Environment Isolation**: Proper environment separation maintained
- [ ] **Acceptance Testing**: Security acceptance criteria met

### Deployment Security
- [ ] **Change Management**: Formal change management process followed
- [ ] **Rollback Plan**: Tested rollback procedures available
- [ ] **Monitoring**: Security monitoring covers new functionality
- [ ] **Documentation**: Security documentation updated

---

## 🛡️ **Control Assessment**

### Existing Controls
- [ ] **Access Controls**: Existing access controls remain effective
- [ ] **Encryption**: Data encryption requirements met
- [ ] **Audit Logging**: Audit trails maintained and enhanced
- [ ] **Network Security**: Network security controls unaffected

### New Controls Required
- [ ] **Additional Monitoring**: New monitoring requirements identified
- [ ] **Enhanced Logging**: Additional logging implementation needed
- [ ] **Access Updates**: Access control updates required
- [ ] **Training**: User training needed for new features

---

## 📅 **Implementation Plan**

### Pre-Deployment
- [ ] **Security Testing Complete**: All security tests passed
- [ ] **Documentation Updated**: Security documentation current
- [ ] **Training Delivered**: Required training completed
- [ ] **Monitoring Ready**: Monitoring systems updated

### Deployment
- [ ] **Deployment Window**: Planned maintenance window scheduled
- [ ] **Rollback Tested**: Rollback procedures verified
- [ ] **Communications**: Stakeholder communications planned
- [ ] **Support Ready**: Support team briefed on changes

### Post-Deployment
- [ ] **Monitoring Active**: Security monitoring verified operational
- [ ] **User Acceptance**: User acceptance testing completed
- [ ] **Incident Response**: Incident response procedures updated
- [ ] **Review Scheduled**: Post-implementation review scheduled

---

## 🎯 **Approval Workflow**

### Technical Approval
- **Developer**: `_____________________` Date: `_____`
- **Technical Lead**: `_____________________` Date: `_____`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected

### Security Approval
- **Security Reviewer**: `_____________________` Date: `_____`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected
- **Conditions**: `_____________________`

### Final Approval
- **Functioneel Beheerder**: `_____________________` Date: `_____`
- **Status**: [ ] Approved [ ] Approved with Conditions [ ] Rejected
- **Implementation Authorization**: [ ] Authorized [ ] Conditional [ ] Denied

---

## 📋 **Checklist for External Development**

> **Only required for third-party development (Archifact, Webwerck, etc.)**

### Supplier Security
- [ ] **Security Agreement**: Current security agreement covers this RFC
- [ ] **Development Oversight**: Supervision and monitoring plan in place
- [ ] **Security Testing**: Independent security testing performed
- [ ] **Code Ownership**: Code ownership and IP rights clear

### Quality Assurance
- [ ] **Security Standards**: Minimum security standards applied
- [ ] **Vulnerability Testing**: Testing for malicious content performed
- [ ] **Known Vulnerabilities**: Testing for known vulnerabilities completed
- [ ] **Documentation**: Technical and functional documentation complete

---

## 🔗 **Quick References**

### Critical Security Patterns
```csharp
// ✅ CORRECT: Extract user context from KrakenD headers
var userId = Request.Headers["x-sub"].FirstOrDefault();
var userRoles = Request.Headers["x-user-roles"].FirstOrDefault()?.Split(',');

// ❌ WRONG: Do NOT validate JWT tokens in services
// builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
```

### Documentation Links
- [`iso-assessment-checklist.md`](iso-assessment-checklist.md) - Full assessment checklist
- [`iso-security-policy.md`](iso-security-policy.md) - Security policy
- [`../authentication-architecture-principles.md`](../authentication-architecture-principles.md) - Authentication architecture

---

**RFC Assessment Status**: [ ] Complete [ ] In Progress [ ] Pending Review  
**Next Action**: `_____________________`  
**Implementation Target**: `_____________________`
