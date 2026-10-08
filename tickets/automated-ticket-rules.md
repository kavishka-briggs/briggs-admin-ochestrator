# Automated Ticket Rules

## 🎯 Purpose

This document defines strict rules for automated ticket creation to ensure consistency, compliance, and maintainability across the Briggs System project.

## 📋 Core Ticket Creation Rules

### Rule 1: Functional Design Focus
- **Requirement**: All tickets MUST focus on functional design with clear requirements and acceptance criteria
- **Implementation**: Each ticket must include:
  - Clear problem statement and objectives
  - Specific functional requirements (what the system should do)
  - Detailed acceptance criteria (how to verify completion)
  - Success metrics where applicable

### Rule 2: Length Limitation
- **Requirement**: Tickets MUST NEVER exceed 500 lines
- **Implementation**: 
  - Keep descriptions concise and focused
  - Use bullet points and structured formatting
  - Remove verbose examples and unnecessary detail
  - Link to documentation instead of repeating content
  - Split large tickets into smaller, focused tickets

### Rule 3: Compliance Verification
- **Requirement**: When a ticket is finished, ALWAYS check compliance with policy and documentation
- **Implementation**: Before marking complete, verify:
  - Authentication architecture compliance (KrakenD-only JWT validation)
  - Security policy requirements from `docs/policy/`
  - Domain isolation principles
  - Gateway routing patterns
  - Documentation hierarchy compliance

### Rule 4: Single Source of Truth
- **Requirement**: NEVER reference other tickets in `/tickets/` subfolders for information
- **Implementation**: 
  - Only use `docs/` folder as the authoritative source
  - Reference specific documentation files, not other tickets
  - If information is missing from docs, update docs first
  - Cross-reference policy documents for compliance requirements

### Rule 5: No Time Estimates
- **Requirement**: Tickets MUST NEVER include time estimates, duration predictions, or effort calculations
- **Implementation**: 
  - Remove all references to hours, days, weeks, or other time-based estimates
  - Focus on functional scope and acceptance criteria instead of duration
  - Let development teams estimate based on their capacity and expertise
  - Avoid creating unrealistic expectations or artificial pressure through time constraints

## 🏗️ Ticket Structure Requirements

### Essential Sections (Required)
1. **Summary** - One sentence describing the deliverable
2. **Objectives** - Clear functional goals and success criteria
3. **Requirements** - Specific functional requirements
4. **Acceptance Criteria** - Testable completion conditions
5. **Implementation Tasks** - Concise action items
6. **Compliance Check** - Policy/security verification

### Optional Sections (Use Sparingly)
- **Context** - Only if essential for understanding
- **Dependencies** - Only external dependencies
- **Technical Details** - Keep minimal, link to docs

### Prohibited Content
- ❌ Verbose JSON/YAML configuration examples (>20 lines)
- ❌ Day-by-day implementation schedules
- ❌ References to other tickets
- ❌ Infrastructure details covered in separate docs
- ❌ Business intelligence details (separate concern)
- ❌ Time estimates, duration predictions, or effort calculations

## 🔍 Quality Gates

### Before Ticket Creation
- [ ] Objective fits within single functional domain
- [ ] Requirements are testable and specific
- [ ] Line count is under 500
- [ ] All references point to `docs/` folder only
- [ ] No time estimates included

### During Ticket Implementation
- [ ] Regular compliance checks against policy documents
- [ ] Verify authentication architecture patterns
- [ ] Confirm domain isolation maintained

### Before Ticket Completion
- [ ] All acceptance criteria met and verified
- [ ] Security policy compliance verified
- [ ] Documentation references updated if needed
- [ ] No policy conflicts detected

## 📚 Reference Hierarchy

When creating tickets, consult sources in this priority order:

1. **Policy Documents** (`docs/policy/`) - SUPREME AUTHORITY
2. **Architecture Documents** (`docs/`) - Core principles
3. **Stack-Specific Docs** (`docs/stack/`) - Implementation guidance
4. **Database Schemas** (`docs/databases/`) - Data structure requirements

## 🚨 Compliance Checkpoints

### Authentication Architecture
- Verify KrakenD is the ONLY JWT token validator
- Confirm no direct authentication in microservices
- Check gateway routing configuration

### Security Policy
- Review `docs/policy/iso-security-policy.md`
- Apply `docs/policy/iso-assessment-checklist.md`
- Verify data protection requirements

### Domain Architecture
- Confirm domain isolation principles
- Verify proper service boundaries
- Check inter-domain communication patterns

## ⚡ Efficiency Guidelines

### Keep Tickets Focused
- One ticket = One functional capability
- Split complex features into logical components
- Avoid mixing infrastructure with application concerns

### Use Documentation References
- Link to existing docs instead of repeating content
- Update docs if information is missing or outdated
- Maintain single source of truth principle

### Optimize for Readability
- Use clear, structured formatting
- Employ bullet points and numbered lists
- Keep paragraphs short and scannable
- Use meaningful section headers

## 🤖 Copilot and Cursor integration

The Briggs Cursor plugin's ticket skill points at this synced file. Keep these
rules as the single source of ticket procedure; do not duplicate the checklist
inside the plugin.

### Automatic Rule Enforcement
These rules are integrated into the Copilot instructions to ensure automatic compliance:

#### When Creating/Modifying Tickets:
```
🎯 TICKET AUTOMATION ACTIVE
✅ Functional design focus enforced
✅ 500-line limit monitored
✅ Policy compliance verification required
✅ Documentation-only references validated
```

#### Copilot Triggers:
- **"create ticket"** → Apply all automated rules
- **"modify ticket"** → Verify compliance before changes
- **"ticket review"** → Execute full quality gate checks
- **"finish ticket"** → Run compliance verification

#### Auto-Validation Checks:
- Line count tracking (auto-warn at 400+ lines)
- Policy conflict detection
- Authentication architecture compliance
- Documentation reference validation
- Domain isolation verification

## 🔄 Continuous Improvement

### Ticket Review Process
1. Verify compliance with all rules before creation
2. Regular review of ticket quality and effectiveness
3. Update rules based on lessons learned
4. Maintain alignment with evolving architecture

### Documentation Updates
- Update this rules document when patterns emerge
- Sync with policy updates and architecture changes
- Ensure rules remain practical and enforceable

### Copilot Learning Integration
- Monitor ticket quality trends
- Refine automation triggers based on usage patterns
- Update rule enforcement mechanisms as needed

---

**Note**: These rules are now actively enforced through Copilot automation. Any exceptions must be explicitly justified and documented.
