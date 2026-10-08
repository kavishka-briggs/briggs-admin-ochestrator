# CDC Pattern - Quick Reference

## Overview
Change Data Capture (CDC) pattern for real-time data synchronization between SQL Server and Service Bus messaging.

## Technology Stack
- **Language**: C# / Azure Functions isolated worker
- **Live targets**: `cdc-pttn` is `net9.0`; `cdc-agencysuite` is `net10.0` (SDK `10.0.400`)
- **Database**: SQL Server with CDC enabled (PTTN for `cdc-pttn`; AgencySuite for `cdc-agencysuite`)
- **Messaging**: Azure Service Bus (topics and, for AgencySuite sales orders, a queue)
- **Trigger**: Timer-based polling (configurable interval)

## Current implementations
| Fact | `cdc-pttn` | `cdc-agencysuite` |
| --- | --- | --- |
| Timer | `[TimerTrigger("*/10 * * * * *")]` | `[TimerTrigger("%CdcPollCron%")]` (Azure default `0 */1 * * * *`) |
| Capture | `cdc.pttn_TOPIC_EVENT_CT` | `cdc.fn_cdc_get_all_changes_agencysuite_SALES_ORDER` / `_CONTACT` / `_CONTACT_ROLE` |
| Watermark | `dbo.cdc_offset_tracker` (single `last_lsn`) | `dbo.LsnStates` per `CaptureName` |
| Destination | Service Bus **topic** from each row's `topic` column | Queue `sales-orders`; employee topics `employee_new` / `employee_change` in Azure |
| Deploy | Azure Functions workflows; no Helm/KEDA | Azure Functions (prod Flex Consumption); no Helm/KEDA |
| JWT | None (timer poller) | None (timer poller) |

## Key Components

### CDC Polling Function
```csharp
[Function("CdcPollingFunction")]
public async Task Run([TimerTrigger("*/10 * * * * *")] TimerInfo timer)
```

### Core Operations
1. **CDC Change Detection**: Query `cdc.{table}_CT` tables for new changes
2. **LSN Tracking**: Maintain last processed Log Sequence Number
3. **Message Publishing**: Send changes to appropriate Service Bus topics
4. **Error Handling**: Log failures and re-throw for Azure Functions runtime

## Environment Variables
`cdc-pttn`:
```bash
SQL_CONNECTION_STRING=Server=...;Database=...;
SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://...
```

`cdc-agencysuite` (double-underscore env names map to configuration sections):
```bash
ConnectionStrings__AgencySuiteDb=Server=...;Database=...;
# Azure: managed identity
ServiceBus__FullyQualifiedNamespace=....servicebus.windows.net
# Local only
ServiceBus__ConnectionString=Endpoint=sb://...
ServiceBus__QueueName=sales-orders
ServiceBus__EmployeeNewTopic=employee_new
ServiceBus__EmployeeChangeTopic=employee_change
CdcPollCron=0 */1 * * * *
Cdc__CaptureName=agencysuite_SALES_ORDER
Cdc__ContactCaptureName=agencysuite_CONTACT
Cdc__ContactRoleCaptureName=agencysuite_CONTACT_ROLE
```

## Common Commands

### Build and Test Locally
```bash
dotnet build
func host start --csharp-isolated --verbose
```

### Deploy to Azure
```bash
dotnet publish --configuration Release --output ./publish
```

### Monitor CDC Changes
```sql
-- Check CDC status
SELECT name, is_cdc_enabled FROM sys.databases

-- View CDC changes
SELECT * FROM cdc.{table}_CT WHERE __$start_lsn > {last_lsn}
```

## Polling Configuration
- **Default**: Every 10 seconds (`*/10 * * * * *`)
- **Format**: Cron expression for timer trigger
- **Considerations**: Balance between latency and resource usage

## Deployment Patterns
- **Azure Functions (current)**: Both `cdc-pttn` and `cdc-agencysuite` deploy with `azure/functions-action`. Keep pollers single-instance (`cdc-pttn` sets `timers.maxConcurrentFunctions: 1`).
- **Kubernetes with KEDA**: Optional high-volume model in `cdc-architecture.md`. **Not present** in either live CDC repository (no `helm/` chart, no KEDA ScaledObject). Do not treat KEDA as the deployed shape of these services.

## Integration Points
- **Source**: SQL Server with CDC enabled tables
- **Destination**: Azure Service Bus topics and/or queues (`cdc-agencysuite` sales orders use a queue)
- **Monitoring**: Azure Application Insights for function execution
- **Authentication**: Timer pollers do not validate JWTs. Azure Service Bus may use managed identity (`cdc-agencysuite` production). Only KrakenD validates JWTs for HTTP APIs.
