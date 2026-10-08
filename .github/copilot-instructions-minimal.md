# Copilot Instructions - Minimal

## Stack Detection → Documentation:
- `*.csproj` → `stack/dotnet/dotnet-[topic].md`
- `package.json` + federation → `stack/react/react-[topic].md`  
- `krakend.json` → `stack/krakend/krakend-[topic].md`
- `helm/Chart.yaml` → `stack/helm/helm-[topic].md`

## Topic Types: 
`quick-reference` | `patterns` | `troubleshooting` | `architecture`

## Non-Negotiables:
- Domain isolation, Gateway routing, Keycloak auth
- Database: Direct reads OK, writes via Rules API

## Database Queries → `databases/`:
- Business data → `pttn-database-schema.md`
- Gateway config → `briggsbase-database-schema.md` 
- Analytics → `plugindb-database-schema.md`

## Ports: Frontend 3000/5173, Backend/Gateway/Auth 8080

**For complex requests:** See full `copilot-instructions.md`
