# Cursor Cloud Agents — developer briefing

**Audience:** Briggs developers using Cursor (IDE or Cloud Agents).  
**Plugins:** team marketplace from [`cursor-plugin`](https://github.com/Briggs-Walker/cursor-plugin).  
**Canonical docs:** this repository.

You do **not** need to paste API keys, VPN profiles, or PATs into chat. Team
Cursor Secrets are already set for Cloud Agents. Ask the agent to use them by
**name**. After anyone **adds or rotates** a secret, start a **new** agent —
the running VM does not pick up mid-run changes.

## What the plugins do for you

| You want to… | What happens |
| --- | --- |
| Implement a feature or bugfix | Agent loads tickets (Project #3), Confluence (`BriggsInho`, `KB`), and this docs repo (`find-context`) |
| Touch auth, tenancy, PTTN, ISO formats | Always-on Briggs constraints; JWT only at KrakenD |
| Compare docs to a service that is **not** in the workspace | `GITHUB_READONLY` fetches **code** via `fetch_service_repo.py` (GitHub **tarball**, usually not `git clone`) |
| Reach a private database or internal server (403, timeout, no route) | `openvpn-cloud` uses `VPN_OVPN_FILE`, retries, then **disconnects** (the VPN pushes a full tunnel) |
| Query Grafana or Sonar | `GRAFANA_*` / `SONARQUBE_*` already injected; public 403 is a token problem, not VPN. **Fix** Sonar findings in code — do not Accept issues or shrink analysis/PR scope to pass the quality gate unless there is no risk |
| Finish a coding task | Agent must open a **ready** PR, request **Copilot** review, **re-request Copilot after every push**, wait for those comments, fix merge conflicts, and handle Copilot/CI (`pr-handoff`) |

Canonical policy and architecture stay in `org-shared-docs`. The plugin tells
the agent **which file to read**; it does not copy those guides into every repo.

## Team secrets (already set)

Treat these as present on Cloud Agents. Confirm with
`echo "$CLOUD_AGENT_INJECTED_SECRET_NAMES"` or `test -n "$NAME"` — **never**
`echo "$NAME"`.

| Name | Used for |
| --- | --- |
| `GITHUB_READONLY` | Read-only GitHub API + tarball of inventory service repos |
| `VPN_OVPN_FILE` | OpenVPN client profile (cert-only; no extra username) |
| `GRAFANA_URL`, `GRAFANA_TOKEN` | Grafana Assistant CLI |
| `SONARQUBE_URL`, `SONARQUBE_TOKEN` | Sonar CLI/MCP |

Optional / per-environment when you have them: `*_DB_CONNECTION_STRING_*`,
`GITHUB_PACKAGES_TOKEN`, test logins. GitHub Actions `DOCS_SYNC_TOKEN` is
**not** a Cursor secret and must not be reused as `GITHUB_READONLY`.

Do not invent a second Grafana or Sonar secret name. Map at runtime if a tool
wants `GRAFANA_SA_TOKEN` or `SONARQUBE_CLI_TOKEN`.

## What you should be aware of

1. **Never paste secrets into Cursor chat** (including `.ovpn` files). If
   something is missing, add it in **Dashboard → Cloud Agents → Secrets** and
   start a new agent.
2. **GitHub 403 ≠ VPN.** 403/404 on `Briggs-Walker/*` is token access
   (`GITHUB_READONLY` needs Contents: Read). 403/timeout on **SQL or internal
   HTTP** is VPN.
3. **Do not `git clone` with `GITHUB_READONLY`.** Fine-grained Contents: Read
   usually cannot speak git; the fetch script uses the tarball API.
4. **Disconnect the VPN after the internal call.** The profile redirects all
   traffic. Leaving it up sends GitHub and Cursor through the tunnel.
5. **Do not print** tokens, connection strings, OpenVPN logs, or `ip addr`
   dumps from `tun0`.
6. **Refresh the team marketplace** after plugin releases
   (Dashboard → Plugins & MCPs → Team Marketplace → Refresh) so Cloud Agents
   load the latest skills.
7. **Include `org-shared-docs`** in the Cloud Agent environment (multi-repo /
   `repositoryDependencies`) so stack and policy files are local.

## How to ask the agent

Useful prompts (no credentials in the message):

- “Follow `find-context` and implement from ticket #N.”
- “This service isn’t in the workspace — fetch it with `GITHUB_READONLY`.”
- “SQL is timing out / internal API 403 — use `openvpn-cloud`, then disconnect.”
- “Query Grafana for last 6h of errors for service X.”
- “Open a ready PR, request Copilot review, re-request Copilot after every push, and wait for comments.”
- “Sonar quality gate failed — fix the finding; do not Accept the issue or shrink analysis scope.”

Plugin layout and ownership: [`cursor-plugin-integration.md`](cursor-plugin-integration.md).
