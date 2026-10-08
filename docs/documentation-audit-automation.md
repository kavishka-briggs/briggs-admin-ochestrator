# Documentation Audit Automation

## Purpose

The documentation system has three separate controls:

1. **Sync** optionally copies canonical documentation to service repositories
   during the transition to central-only documentation.
2. **Fidelity audit** checks whether documented engineering claims match
   service code and configuration. It does not require repo-local copies.
3. **Quality review** scores canonical documentation for clarity,
   actionability, fidelity, efficiency, and security.

Sync success does not prove fidelity. Fidelity findings do not automatically
authorize changes to policy.

## Repository inventory

`config/docs-target-repositories.txt` is the single target list for sync and
audit workflows. Keep comments on separate lines beginning with `#`.

## Deterministic audit

Run locally:

```bash
python3 scripts/docs_audit.py quality --source .
python3 scripts/docs_audit.py fidelity \
  --source . \
  --target ../service-repository \
  --repository Briggs-Walker/service-repository
```

The quality mode verifies canonical files, local Markdown links, duplicate
headings, and critical security anchors. Fidelity mode:

- detects the target stack from repository structure;
- flags service-side .NET JWT validation;
- records evidence in Markdown and JSON reports.

`org-shared-docs` is authoritative. Repo-local `docs/` copies are optional and
may be removed without creating fidelity findings. During migration, run an
explicit distribution check only when diagnosing the sync mechanism:

```bash
python3 scripts/docs_audit.py fidelity \
  --source . \
  --target ../service-repository \
  --repository Briggs-Walker/service-repository \
  --check-synced-copies
```

That opt-in flag reports `sync-missing`, `sync-drift`, and `stack-routing`.
Those are distribution findings, not code-versus-documentation fidelity.

These checks are deliberately conservative. Domain-query, ISO-format, and
business-contract fidelity require repository context and are reviewed through
the `docs-fidelity-audit` skill rather than guessed from broad regular
expressions.

## Scheduled workflow

`.github/workflows/documentation-audit.yml` runs:

- quality checks against this repository;
- a read-only fidelity matrix against every configured target repository;
- report upload and GitHub step summaries.

The initial workflow uses `--fail-on never`: it reports findings without
blocking development while baselines are established. Change this to
`--fail-on error` only after known drift is resolved and false positives are
reviewed.

GitHub Actions fidelity jobs require `DOCS_SYNC_TOKEN` (repository secret on
`org-shared-docs`). Cursor Cloud Agents and Automations must **not** assume
service repositories are mounted in the environment.

Fidelity only reads target repositories, but the same secret drives
documentation sync, which writes. Its required permissions on the repositories
in `config/docs-target-repositories.txt` are Metadata: Read, Contents: Read and
write, Pull requests: Read and write, Workflows: Read and write, and
Administration: Read and write (so `gh pr merge --admin` can bypass branch
protection). See
[`.github/workflows/README.md`](../.github/workflows/README.md). It does not
need access to `org-shared-docs` itself.

## Cursor access to service code

Keep the Cloud Agent environment as `org-shared-docs` only. When a service
repository is not already checked out, fetch its **code** with the Cursor
Secret **`GITHUB_READONLY`**. Do not `git clone` with that token.

Required token permissions:

- selected repositories in `config/docs-target-repositories.txt`
- Metadata: Read
- Contents: Read

Do not grant write access. Do not reuse `DOCS_SYNC_TOKEN` for this purpose.
Never print, log, or commit the token value.

Verify presence by name only:

```bash
test -n "$GITHUB_READONLY" && echo "GITHUB_READONLY=set" || echo "GITHUB_READONLY=missing"
```

Locate or materialize a repository (prefers an existing workspace checkout):

```bash
python3 scripts/fetch_service_repo.py Briggs-Walker/pttn-projectsapi
```

The script resolves default-branch HEAD via the GitHub API. It may try
`gh repo clone` once. Fine-grained PATs with Contents: Read usually cannot
use the git protocol; the script then downloads the repository tarball API
and extracts under `/tmp/docs-audit-repos/`. Expect `source` of
`github-readonly-tarball` and a tree without `.git`. A GitHub 404/403 on
metadata or Contents remains an access blocker, not a fidelity finding.

Then run fidelity against the printed `path`:

```bash
python3 scripts/docs_audit.py fidelity \
  --source . \
  --target /tmp/docs-audit-repos/pttn-projectsapi \
  --repository Briggs-Walker/pttn-projectsapi
```

If `GITHUB_READONLY` is missing, stop and request that Cursor Secret. Adding it
mid-run does not inject it; start a new agent. Reports must not include token
values, `.git/config` remotes that embed credentials, or repository secrets.

## Scheduled Cursor fidelity audit

The daily Cursor automation is read-only against service repositories. It:

1. Starts from current `main`: `git fetch origin main` and branch from
   `origin/main`, not from whatever commit the agent's checkout booted with.
   Reads `config/docs-target-repositories.txt` and
   `config/docs-review-state.json` when present (create an empty ledger in the
   PR if the file is missing).
2. Classifies work with `python3 scripts/select_audit_targets.py --limit 5`.
   Do not re-implement HEAD-vs-watermark selection in the agent; trust that
   JSON. Buckets:
   - **review** — at most five repositories (never-reviewed first). Fetch,
     run `scripts/docs_audit.py fidelity`, then qualitative
     `docs-fidelity-audit`.
   - **fastForward** — default-branch HEAD moved, but every changed path is
     a docs-sync artifact (`docs/`, Copilot instruction files,
     `tickets/automated-ticket-rules.md`,
     `.github/workflows/repository-health.yaml`). Watermark to `headSha`
     with reason `sync-only-fast-forward`. Do not fetch, do not run
     `docs_audit`, do not spend a review slot.
   - **unchanged** — skip (`HEAD` equals `lastReviewedCommit`).
   - **blocked** — GitHub 404/403 or otherwise unreadable. Leave on the
     inventory. Do not watermark.
   - **deferred** — would need review after the cap is full. Leave for the
     next run.
3. Fetches **review** repositories with `scripts/fetch_service_repo.py`
   (workspace checkout first). A GitHub 404/403 here is still a blocker:
   no watermark.
4. Updates the ledger only for completed **review** entries and
   **fastForward** watermarks. Failed, incomplete, or blocked repositories
   keep the previous `lastReviewedCommit` (or none).
5. Applies **required documentation corrections** in the same PR. A watermark
   means the code SHA was reviewed, not that documentation is current.
   `config/docs-open-findings.json` is the queue:
   - **documentation stale** or **source conflict** owned by
     `org-shared-docs` — edit the named canonical path in this PR when the
     change is bounded (catalog facts, versions, env names, aliases, a guide
     that contradicts policy). Record a finding and leave `status: open`
     only for a rewrite too large for this run.
   - **code violates contract** — do not edit docs or policy to match the
     service. Add or keep an open finding with the service as `owner`.
   - Close a finding (`status: applied`) only when the named path on `main`
     matches the accepted claim, or (`status: wont-fix`) with a reason.
6. Opens a draft PR on `org-shared-docs` with reports, those documentation
   corrections, the findings file, fast-forward watermarks, and successful
   review watermarks only.

```bash
python3 scripts/select_audit_targets.py --limit 5
```

### One audit run at a time

The selector reads watermarks from `origin/main`, not from the working tree,
and reports the ref it used as `ledgerSource`. A Cloud Agent whose checkout
predates the previous run's merge would otherwise read stale watermarks and
re-select repositories that were already reviewed.

Before selecting, it lists open pull requests on this repository. While any of
them edits `config/docs-review-state.json`, the run stops with exit code 2 and
prints `blockedByOpenLedgerPullRequest`. Those watermarks exist on no branch
yet, so a second run would review the same repositories and write the same
fixed-path files — `config/docs-review-state.json` and
`audit-reports/deterministic/<owner>-<repo>.{json,md}` — producing a pull
request that conflicts with the first one.

Merge or close the open audit pull request, then run the automation again.
`--ignore-open-ledger-pr` exists for deliberate manual reruns and reintroduces
that conflict risk.

### Why HEAD alone is not a change signal

Documentation sync used to commit into every target repository on each
`org-shared-docs` merge. That still happens on the daily (or manually
dispatched) docs-sync run. A plain `HEAD != lastReviewedCommit` test
re-selects repositories that only received synced documentation.

The selector compares the watermark with HEAD and reports a reason:

| Reason | Meaning | Action |
| --- | --- | --- |
| `never-reviewed` | No watermark yet | Review first — this is what finishes a sweep |
| `code-changed` | Files outside the synced set changed | Review |
| `sync-only` | Only docs-sync-owned paths changed | **Fast-forward the watermark; do not spend a review slot** |
| `unchanged` | HEAD equals the watermark | Skip |
| `compare-unavailable` | History rewritten or compare failed | Review |
| `blocked` | Metadata or HEAD unreadable | No watermark; report as access blocker |

Docs sync owns `docs/**`, the `.github/copilot-*.md` files,
`.github/workflows/repository-health.yaml`, and
`tickets/automated-ticket-rules.md`. A change confined to those paths is this
automation's own output. Anything else — including the repository's own
`README.md` or other workflows — counts as service change.

Record `sync-only` repositories in the ledger at the new HEAD with
`"reason": "sync-only-fast-forward"` and no report link. They were already
reviewed at the previous commit and their code did not move.

Inaccessible repositories are blockers, not fidelity classifications. They stay
on the inventory and do not receive watermarks.

### Keep the loop closed

Merge each fidelity draft PR before the next run. An unmerged ledger means the
next run re-resolves the same repositories and repeats work; the preflight
above turns that into a clean stop instead of a conflicting pull request.

## Finding ownership

| Classification | Action |
| --- | --- |
| Optional synced copy differs | Distribution-only finding. Wait for daily docs-sync, run it manually, or remove the obsolete copy. Do not treat it as fidelity drift. |
| Accepted code makes docs stale | Change the named path in `org-shared-docs` in the audit PR (or the next PR if the rewrite is large), record it in `config/docs-open-findings.json` until applied, then sync |
| Code violates a valid contract | Fix the service repository. Record the finding; do not rewrite policy |
| Policy conflicts with another source | Policy wins; rewrite the weaker document in `org-shared-docs` in the same PR |
| Plugin constraint/path/trigger changed | Update `cursor-plugin` separately |

Audits are read-only against **service code and policy**. Canonical catalog,
stack, and architecture files that the review proved stale or conflicting are
edited in the audit PR. Handoff still applies.
