# Briggs Admin Orchestrator

The Briggs Admin Orchestrator is the React microfrontend shell for the Briggs platform. It provides shared routing and authentication integration, loads enabled modules through Module Federation, and coordinates navigation between those modules.

## Repository

- GitHub: [Briggs-Walker/briggs-admin-orchestrator](https://github.com/Briggs-Walker/briggs-admin-orchestrator)
- Clone URL: `git@github.com:Briggs-Walker/briggs-admin-orchestrator.git`

## Requirements

- Node.js `>=22.22.0`
- pnpm

## Run locally

From the repository root:

```sh
cd frontend
pnpm install
pnpm dev
```

Vite serves the frontend at `http://localhost:5173`. The app uses runtime configuration in `frontend/public/config-orch.js` and loads remote modules, so configure the relevant service and module URLs for your environment before testing integrated flows.

## Useful commands

Run these from `frontend/`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Type-check and create a production build |
| `pnpm test` | Run the test suite |
| `pnpm lint` | Run ESLint |

## Landing page

The home route shows the signup page when the user is logged out. After login, it opens the Project Basic module. Other modules remain available through their own routes.

## Documentation

- [AI quick start](docs/ai-quick-start.md) — navigation to stack-specific guidance
- [React orchestrator architecture](docs/stack/react/react-orchestrator-architecture.md) — frontend architecture and module federation patterns
- [Repository overview](docs/repository-overview.md) — Briggs platform repository context