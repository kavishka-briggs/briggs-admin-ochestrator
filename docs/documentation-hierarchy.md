# Documentation Hierarchy and Policy Supremacy

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Last Updated**: June 15, 2025

## 🏛️ Documentation Authority Hierarchy

The Briggs System documentation follows a strict hierarchy where **policy documentation is SUPREME and OVERRIDES all other documentation**.

### Authority Levels (Highest to Lowest)

1. **🥇 SUPREME AUTHORITY**: `docs/policy/` folder
   - **Overrides ALL other documentation**
   - Security policies, compliance requirements, assessment procedures
   - Any conflicts with other docs → Policy wins

2. **🥈 ARCHITECTURAL AUTHORITY**: Core architecture documents
   - `authentication-architecture-principles.md`
   - `domain-architecture.md`
   - `application-architecture.md`
   - These define system-wide patterns but must comply with policy

3. **🥉 STACK AUTHORITY**: Stack-specific documentation
   - `stack/[technology]/` folders
   - Implementation patterns for specific technologies
   - Must comply with both policy and architectural principles

4. **📚 REFERENCE AUTHORITY**: Supporting documentation
   - Database schemas, quick references, troubleshooting guides
   - Provide implementation details within established frameworks

## 🚨 Conflict Resolution Rules

### When Copilot Finds Conflicting Documentation

**MANDATORY WARNING PROTOCOL**: When any conflict is detected between policy and other documentation:

```
⚠️ **POLICY CONFLICT DETECTED** ⚠️

CONFLICT: [Brief description of the conflict]
POLICY REQUIREMENT: [What the policy requires]
CONFLICTING DOCUMENTATION: [File/section that conflicts]

**RESOLUTION**: Policy documentation takes precedence.
**ACTION REQUIRED**: The conflicting documentation should be updated to align with policy.

**PROCEEDING WITH**: Policy-compliant approach as defined in docs/policy/
```

### Specific Conflict Scenarios

1. **Security Requirements**
   - Policy says: "All authentication must use Keycloak MFA"
   - Stack doc says: "Optional: Configure MFA"
   - **Resolution**: Policy wins - MFA is mandatory

2. **Architecture Patterns**
   - Policy says: "Only KrakenD validates JWT tokens"
   - Service doc says: "Validate JWT in service middleware"
   - **Resolution**: Policy wins - use KrakenD-only pattern

3. **Compliance Procedures**
   - Policy says: "RFC security assessment required"
   - Deployment doc says: "Security review optional"
   - **Resolution**: Policy wins - security assessment mandatory

## Cursor (rules vs skills)

The Briggs `cursor-plugin` owns shared executable rules and skills. Codify only
**constraints and routing** in plugin rules (policy supremacy, conflict template,
KrakenD-only JWT). Codify **assessment/review/ticket procedures** as plugin
skills. Full policy text stays in this repository—skills must open the synced
policy files rather than paraphrase them. See
[`cursor-plugin-integration.md`](cursor-plugin-integration.md).

## 🎯 Implementation Guidelines for AI Agents

### Detection Protocol
1. **Always check policy first** for any security, compliance, or architectural decisions
2. **Scan for conflicts** when referencing multiple documentation sources
3. **Issue warnings** when conflicts are detected
4. **Default to policy** when in doubt

### Response Structure
When policy conflicts are detected, use this standardized format:

**Use the "POLICY CONFLICT DETECTED" template above** - it provides comprehensive structure for documentation conflicts and clear action steps.

## 📋 Policy Enforcement Checklist

### For Security Assessments
- [ ] Check `docs/policy/iso-security-policy.md` FIRST
- [ ] Use `docs/policy/iso-assessment-checklist.md` as authoritative source
- [ ] Cross-reference findings with `docs/policy/iso-controls-matrix.md`
- [ ] Flag any conflicting security guidance in other docs

### For Architecture Decisions
- [ ] Verify compliance with `docs/policy/` requirements
- [ ] Check authentication patterns against policy
- [ ] Ensure domain isolation meets policy standards
- [ ] Validate monitoring approaches with policy requirements

### For Code Reviews
- [ ] Apply policy security requirements as non-negotiable
- [ ] Check for authentication architecture compliance
- [ ] Verify data protection meets policy standards
- [ ] Ensure change management follows policy procedures

## 🔄 Documentation Maintenance

### Policy Updates
- Policy changes require review of ALL other documentation
- Conflicts must be resolved within 30 days of policy updates
- Version control tracks policy supremacy decisions

### Conflict Reporting
- Log all detected conflicts for documentation team review
- Automated checks should flag policy violations
- Regular audits ensure hierarchy compliance

## 📞 Escalation Process

### When Policy is Unclear
1. Reference `docs/policy/README.md` for guidance
2. Check `docs/policy/iso-quick-reference.md` for fast decisions
3. Escalate to documentation team if ambiguity persists

### When Policy Conflicts with Business Requirements
1. **Never override policy without authorization**
2. Document the business requirement vs. policy conflict
3. Escalate to appropriate governance body
4. Update policy through official change management process

---

**REMEMBER**: This hierarchy ensures security, compliance, and architectural consistency across the entire Briggs System. Policy supremacy is not optional—it's foundational to system integrity.
