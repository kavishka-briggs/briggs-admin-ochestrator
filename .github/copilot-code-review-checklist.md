# GitHub Copilot Code Review Checklist

## Overview
This checklist provides a systematic approach for GitHub Copilot to perform comprehensive code reviews that assess repository compliance with documentation standards. The agent should follow this checklist exactly and provide consistent, structured feedback without making any file changes.

## Pre-Review Instructions for Copilot
When asked to perform a code review, the agent must:
1. **READ-ONLY MODE**: Never make changes to files during review
2. **Follow this checklist sequentially**
3. **Use the standardized output format below**
4. **Provide specific line numbers and file references**
5. **Reference relevant documentation sections**

---

## Code Review Checklist

### Phase 1: Documentation Discovery & Compliance Assessment

#### 1.1 Documentation Structure Analysis
- [ ] Discover and catalog all documentation in `/docs/` folder
- [ ] Identify project stacks based on actual file patterns found
- [ ] Map discovered stacks to available documentation (if any)
- [ ] Note any documented standards, patterns, or requirements

#### 1.2 Architecture Standards Assessment
- [ ] **Identify documented architecture principles** from available docs
- [ ] **Check for domain/service separation standards** if documented
- [ ] **Validate routing patterns** against any documented approaches
- [ ] **Review authentication implementation** against documented standards
- [ ] **Verify configuration patterns** match any documented conventions

#### 1.3 Database Integration Compliance
- [ ] **Discover database documentation** in `/docs/databases/` or elsewhere
- [ ] **Map database usage patterns** to available schema documentation
- [ ] **Check query implementations** against documented patterns (if any)
- [ ] **Validate data access approaches** per available guidelines

#### 1.4 Authentication Architecture Compliance (CRITICAL)

> **ONLY KrakenD validates JWT tokens**. Individual services should NOT implement JWT validation.

##### ❌ CRITICAL VIOLATIONS - Flag these immediately:
- [ ] **JWT Validation in Services**: `AddAuthentication()`, `AddJwtBearer()`, JWT middleware in individual services
- [ ] **Authentication Middleware**: `app.UseAuthentication()` in individual services  
- [ ] **Direct JWT Access**: `HttpContext.User`, JWT claims extraction in services
- [ ] **Keycloak Direct Integration**: Individual services connecting to Keycloak
- [ ] **Multiple Auth Points**: Different authentication mechanisms across services

#### 1.5 ISO Data Format Standards Compliance (MANDATORY)

> **ALL APIs must use ISO standardized data formats** - see `docs/api-development-standards.md`

##### ❌ CRITICAL VIOLATIONS - Flag these immediately:
- [ ] **Non-ISO Country Formats**: Using country names, non-standard codes, ISO 3166-1 alpha-3
- [ ] **Non-ISO Language Formats**: Using language names, locales, non-standard codes  
- [ ] **Non-ISO Currency Formats**: Using currency names, symbols, non-standard codes
- [ ] **Non-ISO Date Formats**: Not using ISO 8601 format with timezone information
- [ ] **Missing Validation**: No validation attributes for ISO format compliance

##### ✅ CORRECT PATTERNS - Verify these exist:
- [ ] **Country Codes**: ISO 3166-1 alpha-2 format ("NL", "BE", "FR") with validation
- [ ] **Language Codes**: ISO 639-1 format ("en", "nl", "fr") with validation
- [ ] **Currency Codes**: ISO 4217 format ("EUR", "USD", "GBP") with validation
- [ ] **Date/Time**: ISO 8601 format with timezone information
- [ ] **Validation Attributes**: Proper regex validation for ISO formats

##### ✅ CORRECT PATTERNS - Verify these exist:
- [ ] **Header Context Extraction**: Services use `Request.Headers["x-sub"]` for user ID
- [ ] **KrakenD Claims Propagation**: Gateway configured with `propagate_claims`
- [ ] **BaseController Pattern**: Common user context extraction in base classes
- [ ] **Domain Authorization**: Business-level authorization using header context
- [ ] **No Auth Middleware**: Services have NO authentication/authorization middleware

##### 🔍 Code Review Focus:
```csharp
// ❌ CRITICAL VIOLATION - Flag immediately
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
app.UseAuthentication()
var userId = HttpContext.User.FindFirst("sub")?.Value

// ✅ CORRECT PATTERN - Should see this
var userId = Request.Headers["x-sub"].FirstOrDefault()
```

**Reference**: [`authentication-architecture-principles.md`](../docs/authentication-architecture-principles.md)

### Phase 2: Code Quality & Documentation Alignment

#### 2.1 File Structure & Organization Assessment
- [ ] **Analyze actual project structure** and compare to any documented conventions
- [ ] **Check naming patterns** against documented standards (if any)
- [ ] **Validate folder organization** per available guidelines
- [ ] **Review component placement** according to documented architecture

#### 2.2 Configuration Standards Compliance
- [ ] **Assess configuration files** against documented patterns
- [ ] **Check build/deployment configs** per available documentation
- [ ] **Validate environment handling** according to documented approaches
- [ ] **Review dependency management** against documented standards

#### 2.3 Security & Best Practices Alignment
- [ ] **Check security implementations** against documented guidelines
- [ ] **Validate data handling** per documented security practices
- [ ] **Review access control** according to documented patterns
- [ ] **Assess error handling** against documented approaches

### Phase 3: Integration & Implementation Consistency

#### 3.1 Inter-Service Communication Assessment
- [ ] **Check service communication patterns** against documented approaches
- [ ] **Validate API contracts** per available interface documentation
- [ ] **Review error handling** according to documented patterns
- [ ] **Assess logging/monitoring** against documented standards

#### 3.2 Data Integration Compliance
- [ ] **Check database connections** against documented patterns
- [ ] **Validate query approaches** per available guidelines
- [ ] **Review data access layers** according to documented architecture
- [ ] **Assess migration strategies** against documented practices

#### 3.3 Deployment & Operations Alignment
- [ ] **Check deployment configurations** against documented procedures
- [ ] **Validate environment setups** per available documentation
- [ ] **Review resource definitions** according to documented standards
- [ ] **Assess operational practices** against documented guidelines

---

## Standardized Output Format

When performing a code review, GitHub Copilot must use this exact format:

```markdown
# Code Review Report
**Date**: [Current Date]
**Repository**: [Repository Name]
**Reviewer**: GitHub Copilot
**Review Type**: Documentation Compliance Assessment

## Executive Summary
[Brief overview of compliance status - 2-3 sentences]

## Documentation Discovery
**Available Documentation**: [List found documentation files/folders]
**Detected Stack(s)**: [List detected stacks based on file analysis]
**Documentation Coverage**: [✅ Complete | ⚠️ Partial | ❌ Missing] for identified areas

## Compliance Assessment

### ✅ Compliant Areas
- [List areas that meet documented standards]
- [Include specific file references and line numbers]

### ⚠️ Areas Requiring Attention
- [List areas with minor compliance issues based on available documentation]
- [Include specific recommendations and documentation references]

### ❌ Non-Compliant Areas
- [List areas that violate documented standards]
- [Include specific file paths, line numbers, and required changes]

## Architecture Review
[Assess based on discovered architectural documentation]

### [Documented Architecture Principle 1]: [✅ Compliant | ⚠️ Partial | ❌ Non-Compliant]
[Details and specific findings based on available docs]

### [Documented Architecture Principle 2]: [✅ Compliant | ⚠️ Partial | ❌ Non-Compliant]
[Details and specific findings based on available docs]

### [Additional principles as found in documentation]

## Implementation Standards Review
[Based on discovered implementation guidelines]

### [Documented Standard 1]: [✅ Compliant | ⚠️ Partial | ❌ Non-Compliant]
[Details and specific findings]

### [Documented Standard 2]: [✅ Compliant | ⚠️ Partial | ❌ Non-Compliant]
[Details and specific findings]

## Recommendations

### High Priority
1. [Specific actionable recommendations based on documented standards]
2. [Reference to relevant documentation sections]

### Medium Priority
1. [Specific actionable recommendations]
2. [Reference to relevant documentation sections]

### Low Priority
1. [Specific actionable recommendations]
2. [Reference to relevant documentation sections]

## Documentation Gaps
- [List areas where documentation might be missing but would be helpful]
- [Suggest documentation that could improve compliance assessment]

## Documentation References
- [List all referenced documentation files found during review]
- [Include direct paths to relevant sections]

## Next Steps
1. [Prioritized list of actions based on available documentation]
2. [Suggested timeline for implementation]
3. [Recommendations for documentation improvements if applicable]

---
**Note**: This review was conducted in read-only mode. No files were modified during this assessment.
**Review Scope**: Assessment based on available documentation found in repository.
```

## Usage Instructions for Copilot

### When Asked to Perform a Code Review:

1. **Start with**: "I'll perform a comprehensive code review following our established checklist, discovering and assessing against available documentation..."

2. **Discovery First**: Begin by exploring the repository structure and documentation
   - Use `list_dir` and `file_search` to discover documentation structure
   - Use `semantic_search` to find patterns: "documentation", "standards", "patterns", "architecture"
   - Read key documentation files to understand established standards

3. **Execute the checklist**: Go through each phase systematically based on discovered documentation

4. **Assess against discovered standards**: Compare implementation against documented approaches
   - Reference specific documentation sections found
   - Note areas where documentation exists but isn't followed
   - Identify areas where documentation might be missing

5. **Generate adaptive report**: Use the standardized format but adapt sections based on discovered documentation

6. **End with**: "This review was conducted in read-only mode. No files were modified."

### Key Principles:
- **Documentation-driven assessment** - base all compliance checks on discovered documentation
- **Never modify files** during code review
- **Always reference specific line numbers** and file paths
- **Adapt review scope** to available documentation
- **Provide actionable recommendations** with clear priorities
- **Note documentation gaps** that could improve future assessments

### Discovery Priority:
1. **Architecture documentation** - Look for overall system design docs
2. **Stack-specific documentation** - Find technology-specific guidelines  
3. **Database documentation** - Discover schema and access pattern docs
4. **Configuration standards** - Find deployment and environment docs
5. **Security guidelines** - Look for authentication and security docs

### Emergency Override:
If asked to make changes during a code review, respond with:
"Code reviews are conducted in read-only mode per our checklist. I can perform the review and provide recommendations, then assist with implementing changes in a separate session."

---

## Maintenance Notes
- Update this checklist when new stack documentation is added
- Revise compliance criteria when architecture changes
- Ensure output format remains consistent across all reviews
- Regular validation against actual documentation structure
