# Documentation Quality Rubric

**Status:** Canonical rubric for reviewing Briggs documentation.

Use this rubric for documentation in `org-shared-docs`. Synced copies in
service repositories are checked for fidelity, not scored independently.

## Scoring

Score each dimension from 0 to 2 and cite file/line evidence.

| Score | Meaning |
| --- | --- |
| 2 | Meets the bar; a developer or agent can rely on it without clarification |
| 1 | Usable with a specific, bounded gap |
| 0 | Misleading, unsafe, contradictory, or not actionable |

Total interpretation:

- **9–10:** pass;
- **6–8:** warning; improve the cited gaps;
- **0–5:** fail; do not treat the document as ready.

A security score of 0 is always a fail, regardless of total. A fidelity score
of 0 must be classified as either **documentation stale**, **code violates the
contract**, or **source conflict** before anyone edits a source of truth.

## 1. Clarity

Pass when:

- the document has one identifiable job and audience;
- terms, component names, and authority are unambiguous;
- headings make the decision path scannable;
- normative words (`must`, `should`, `may`) are used consistently;
- conflicts identify both sources and the applicable authority.

Fail when multiple stacks are mixed without a boundary, a term has competing
meanings, or examples contradict the stated rule.

## 2. Actionability

Pass when:

- prerequisites, ordered steps, expected outcomes, and verification are named;
- commands and paths are complete enough to execute;
- stop conditions and failure handling are explicit;
- ownership or escalation is identified when the reader cannot proceed.

Fail when guidance says only “ensure”, “consider”, or “be careful” without a
testable action.

## 3. Fidelity

Pass when:

- claims match accepted behavior in representative service repositories;
- paths, APIs, configuration keys, and examples still exist;
- stack detection routes to the correct guide;
- policy, architecture, stack, and reference sources follow
  `docs/documentation-hierarchy.md`.

Evidence must distinguish:

1. code that violates a still-valid contract;
2. accepted code that makes documentation stale;
3. conflicting source documents that require governance resolution.

Do not update policy merely because one repository diverged.

## 4. Efficiency

Pass when:

- `docs/ai-quick-start.md` routes a task to the smallest sufficient document;
- content is not duplicated across rules, skills, stack guides, and references;
- examples add information rather than restating prose;
- long catalogs and troubleshooting trees stay out of always-on Cursor rules;
- the likely reader can find the answer without loading unrelated stacks.

Fail when the same procedure has multiple sources of truth or an agent must
load broad documentation for a narrow task.

## 5. Security

Pass when:

- `docs/policy/` remains supreme;
- only KrakenD validates JWTs and services consume propagated identity context;
- tenant paths preserve Domain → Account → Project → Office isolation;
- PTTN writes use the Rulesengine API and reads remain domain scoped;
- APIs use required ISO data formats;
- examples contain no secrets, credentials, unsafe bypasses, or production data.

Negative examples must be clearly marked as prohibited and must not be
copy-pastable without that warning.

## Required review output

Use this structure:

```text
Document: <path>
Scope: <purpose and representative repositories checked>
Clarity: <0-2> — <evidence>
Actionability: <0-2> — <evidence>
Fidelity: <0-2> — <evidence and classification>
Efficiency: <0-2> — <evidence>
Security: <0-2> — <evidence>
Total: <0-10> — PASS | WARNING | FAIL
Required changes:
- <smallest actionable change, owner/source, verification>
```

The review is read-only. Create a separate change to fix accepted findings.
