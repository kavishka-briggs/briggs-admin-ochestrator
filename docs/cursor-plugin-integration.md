# Cursor Plugin Integration

**Status:** Authoritative ownership and distribution model for Briggs Cursor
customizations.

## Repository responsibilities

| Repository | Owns | Does not own |
|------------|------|--------------|
| [`org-shared-docs`](https://github.com/Briggs-Walker/org-shared-docs) | Policy, architecture, stack guides, database schemas, assessment checklists, ticket rules, Copilot instructions | Installed Cursor rules, skills, commands, hooks, or MCP configuration |
| [`cursor-plugin`](https://github.com/Briggs-Walker/cursor-plugin) | The installable Cursor plugin: short rules, workflow skills, commands, hooks, MCP configuration, and plugin release metadata | Copies of architecture guides, policy bodies, schemas, or troubleshooting manuals |
| Service repositories | Repository-specific exceptions, build/test commands, and local examples | Copies of organization-wide Cursor rules and skills |

The shared documentation remains the source of truth. The plugin tells the
agent **which constraints apply and which synced document to read**. It must not
fork or paraphrase long-form documentation.

Developer briefing (how to use Cloud Agents and team secrets):
[`cursor-cloud-agent-briefing.md`](cursor-cloud-agent-briefing.md).

## Distribution

Install `cursor-plugin` through the Briggs team marketplace. Do not copy a
shared `.cursor/` directory into every service repository.

Project `.cursor/rules` and `.cursor/skills` are reserved for guidance that is
genuinely local to that repository. Avoid reusing a plugin rule or skill name in
a project because Cursor does not document conflict precedence for duplicate
plugin and project artifacts.

During migration, the documentation sync workflow may place `docs/` and the
Copilot instruction suite into service repositories. Those copies are caches,
not required inputs or sources of truth. Plugin skills first use
`org-shared-docs` when it is present in the workspace, and may fall back to
stable local paths such as:

- `docs/policy/iso-assessment-checklist.md`
- `docs/authentication-architecture-principles.md`
- `docs/databases/database-access-patterns.md`
- `.github/copilot-code-review-checklist.md`
- `tickets/automated-ticket-rules.md` when ticket automation is required

If neither `org-shared-docs` nor a fallback copy is available, the skill must
name the missing canonical source instead of silently substituting remembered
guidance. Removing service-repository `docs/` must not create fidelity
failures.

Cloud Agents that need service **code** for reference, and that do not have
that repository in the environment, use the Cursor Secret `GITHUB_READONLY`
(Contents: Read, Metadata: Read) via `scripts/fetch_service_repo.py`. Do not
`git clone` with that token; fine-grained PATs typically use the tarball API
instead. Canonical documentation comes from this repository; a synced copy is
only a fallback cache. Do not fetch mutable docs from the network. Never print
the token. See
[`documentation-audit-automation.md`](documentation-audit-automation.md).

## What belongs in plugin rules

Keep rules short. They should contain hard constraints and documentation
routing only.

### Always-on core rule

- `docs/policy/` overrides architecture, stack, and reference documentation.
- Only KrakenD validates JWTs. Microservices consume propagated identity
  headers.
- All tenant data paths enforce domain isolation using the
  Domain → Account → Project → Office hierarchy.
- Inter-service API traffic goes through KrakenD.
- PTTN writes use the Rulesengine API; direct reads remain domain scoped.
- APIs use ISO 3166-1 alpha-2 country codes, ISO 639-1 language codes,
  ISO 4217 currency codes, and ISO 8601 date/time values.
- Route the agent to `docs/ai-quick-start.md` and the detected stack guide.
- Unmounted `Briggs-Walker/*` **service code** is fetched with Cursor Secret
  `GITHUB_READONLY` (`scripts/fetch_service_repo.py`, tarball API when git
  clone is unavailable). A missing checkout is not “repository does not
  exist.” Canonical docs still come from this repository; do not fetch docs
  from the network.
- Internal Briggs databases and servers that return 403, timeout, or
  connection refused are reached over OpenVPN (`openvpn-cloud`, secret
  `VPN_OVPN_FILE`). GitHub 403 is not a VPN problem. Connect only for the
  internal call: the profile pushes a full tunnel.

### Stack rules

Use file-scoped rules for .NET, React, KrakenD, Helm, Keycloak, CDC, ClamAV,
Storybook, and database work. A stack rule should contain only:

1. the applicable non-negotiable constraints;
2. the canonical local documentation paths;
3. one or two high-value prohibited patterns.

Keep globs tight to the stack-detection signals in `docs/ai-quick-start.md`.
Do not paste code examples, port tables, troubleshooting trees, or schema
catalogs into rules.

When stack examples disagree with
`docs/authentication-architecture-principles.md` (header names, JWT algorithm,
issuer), the authentication principles document wins unless `docs/policy/`
says otherwise.

## What belongs in plugin skills

Use skills for multi-step procedures:

| Skill intent | Canonical procedure |
|--------------|---------------------|
| ISO, RFC, or compliance assessment | `docs/policy/iso-assessment-checklist.md`, `iso-rfc-template.md`, and `iso-controls-matrix.md` |
| Documentation-compliance code review | `.github/copilot-code-review-checklist.md` |
| Create, modify, review, or finish a ticket | `tickets/automated-ticket-rules.md` |
| Compare docs with service repositories | `docs/documentation-audit-automation.md` and `documentation-quality-rubric.md`; fetch missing service **code** with `GITHUB_READONLY` (`fetch_service_repo.py`, tarball fallback) |
| Reach internal databases or private servers from a Cloud Agent | OpenVPN profile secret `VPN_OVPN_FILE`; plugin skill `openvpn-cloud`. Disconnect after the call (full tunnel). Do not use VPN for GitHub 403. |
| SonarQube quality gate on a PR | Fix the finding in code (`sonarqube-cloud`, always-on `sonar-fix-dont-accept`). Do not Accept / Won't Fix or shrink analysis/PR scope unless there is no risk. |
| Score canonical documentation quality | `docs/documentation-quality-rubric.md` |

A `SKILL.md` should select the right canonical file, state the execution order,
and define stop conditions. The checklist itself stays in this repository.

## Expected plugin layout

The marketplace lives at the repository root. Distributable plugins live under
`plugins/` (`pluginRoot`). Workflow plugins (PR handoff, secrets, Grafana,
SonarQube, find-context) coexist with the documentation-guidance plugin:

```text
cursor-plugin/
├── .cursor-plugin/
│   └── marketplace.json
├── plugins/
│   └── briggs-docs-guidance/
│       ├── .cursor-plugin/
│       │   └── plugin.json
│       ├── rules/
│       │   ├── briggs-core.mdc
│       │   └── stack-*.mdc
│       └── skills/
│           ├── compliance-code-review/SKILL.md
│           ├── create-briggs-ticket/SKILL.md
│           ├── docs-fidelity-audit/SKILL.md
│           ├── docs-quality-review/SKILL.md
│           └── iso-security-assessment/SKILL.md
└── README.md
```

Use lowercase kebab-case names. Plugin rules and skills reference synced
repository files; they do not fetch mutable documentation from the network.
Validate marketplace and plugin manifests against their schemas. In
`cursor-plugin`, `python3 scripts/validate-plugins.py` covers schema
constraints, glob isolation, canonical path checks, and local `.cursor/`
mirrors.

## Change process

1. Change canonical policy or architecture here first.
2. Update the plugin only when a constraint, trigger, file path, or procedure
   routing changed.
3. Test the plugin locally from `~/.cursor/plugins/local/<plugin-name>` and
   reload Cursor.
4. Verify rules and skills appear under **Customize**.
5. Test one matching and one non-matching task to ensure conditional content is
   not loaded globally.
6. Release the plugin through the team marketplace.
7. Let the daily (or manually dispatched) docs-sync workflow update local
   canonical files in service repositories. Merging `org-shared-docs` does
   not itself open PRs in those repositories.

There is no documented `cursor plugin validate` CLI. Validate manifests against
their schemas and perform the local load test.
