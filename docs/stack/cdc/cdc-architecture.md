# CDC Pattern Architecture

## Overview
The Change Data Capture (CDC) pattern enables real-time data synchronization by capturing and propagating database changes to downstream systems through messaging infrastructure.

## Architecture Principles

### Event-Driven Data Flow
```
SQL Server (CDC) → Polling Function → Service Bus → Consumer Services
```

### Key Components

#### 1. CDC Source (SQL Server)
- **Purpose**: Source of truth for data changes
- **Technology**: SQL Server with CDC enabled
- **CDC Tables**: Automatically generated `cdc.{table}_CT` change tracking tables
- **LSN Tracking**: Log Sequence Numbers for ordered change processing

#### 2. Polling Function (Azure Function)
- **Purpose**: Detect, process, and route CDC changes
- **Execution Model**: Timer-triggered isolated worker process
- **Scaling**: Single instance to prevent duplicate processing
- **State Management**: LSN offset tracking in dedicated table

#### 3. Messaging Layer (Service Bus)
- **Purpose**: Decouple change detection from consumption
- **Destinations**: Topics and queues (per-table, per-event-type, or a dedicated queue)
- **Guarantees**: At-least-once delivery with idempotency patterns
- **Retention**: Configurable message retention for replay scenarios

#### 4. Consumer Services
- **Purpose**: Process specific change events for business logic
- **Pattern**: Event sourcing and CQRS implementations
- **Scaling**: Independent scaling per consumer type

### Current Briggs implementations (2026-09-22)

| | `cdc-pttn` | `cdc-agencysuite` |
| --- | --- | --- |
| Target | `net9.0` isolated worker | `net10.0` isolated worker |
| Source | PTTN `cdc.pttn_TOPIC_EVENT_CT` | AgencySuite `SALES_ORDER` / `CONTACT` / `CONTACT_ROLE` CDC |
| Watermark | `dbo.cdc_offset_tracker` (one `last_lsn`) | `dbo.LsnStates` per capture name |
| Bus | Topic name from each CDC row | Queue `sales-orders`; employee topics |
| Deploy | Azure Functions only | Azure Functions only (prod Flex Consumption) |
| JWT | None | None |

Neither repository contains Helm or KEDA. Kubernetes with KEDA below remains an **optional** high-volume model, not the live deployment of these two services.

Application PTTN writes still go through the Rulesengine API. These pollers **read** CDC change tables and persist only an LSN watermark. That watermark is not a Rulesengine bypass.

## Deployment Models

### Azure Functions (Serverless)
**Best For**: Low to medium volume changes, cost optimization
```yaml
Pros:
  - Zero infrastructure management
  - Automatic scaling and cost optimization
  - Built-in monitoring and logging
  - Easy deployment and configuration

Cons:
  - Cold start latency
  - Limited execution time (10 minutes max)
  - Less control over scaling behavior
```

### Kubernetes with KEDA (Container)
**Best For**: High volume changes, precise control
```yaml
Pros:
  - Fine-grained scaling control
  - Consistent runtime environment
  - Better resource utilization
  - Advanced scheduling and placement

Cons:
  - Infrastructure management overhead
  - More complex deployment pipeline
  - Manual monitoring setup required
```

## Data Flow Patterns

### Change Detection Flow
1. **Timer Trigger**: Function executes on configurable schedule
2. **LSN Query**: Retrieve last processed LSN from offset table
3. **CDC Query**: Fetch new changes where `__$start_lsn > last_lsn`
4. **Batch Processing**: Process changes in LSN order
5. **Message Publishing**: Send to appropriate Service Bus topics
6. **LSN Update**: Store highest processed LSN for next iteration

### Error Handling Strategy
```csharp
try {
    // Process CDC changes
    await ProcessChanges();
    await UpdateLSN();
} catch (Exception ex) {
    _logger.LogError("CDC processing failed: {Message}", ex.Message);
    throw; // Re-throw for Azure Functions retry logic
}
```

### Scaling Considerations

#### Vertical Scaling (Single Instance)
- **LSN Ordering**: Maintains sequential processing
- **Simplicity**: No coordination between instances required
- **Bottleneck**: Limited by single instance throughput

#### Horizontal Scaling (Multiple Instances)
- **Partitioning**: By table, schema, or hash key
- **Coordination**: Distributed locking or leader election
- **Complexity**: Requires careful orchestration

## Configuration Patterns

### Polling Frequency
```csharp
// High frequency (real-time)
[TimerTrigger("*/10 * * * * *")] // 10 seconds

// Medium frequency (near real-time)
[TimerTrigger("0 */1 * * * *")]  // 1 minute

// Low frequency (batch processing)
[TimerTrigger("0 */5 * * * *")]  // 5 minutes
```

### Service Bus Topic Strategy
```csharp
// Per-table topics
topics: ["user_changes", "order_changes", "inventory_changes"]

// Per-operation topics
topics: ["inserts", "updates", "deletes"]

// Per-domain topics
topics: ["customer_domain", "inventory_domain", "finance_domain"]
```

## Monitoring and Observability

### Key Metrics
- **Change Processing Rate**: Changes per minute/hour
- **Lag Indicator**: Time between change and processing
- **Error Rate**: Failed processing attempts
- **LSN Progress**: Current vs. latest available LSN

### Alerting Thresholds
- **Processing Lag**: > 5 minutes behind latest changes
- **Error Rate**: > 5% of processing attempts fail
- **Function Failures**: Any function execution failures

### Logging Strategy
```csharp
_logger.LogInformation("Processing {Count} CDC changes from LSN {LastLSN}", 
    changes.Count, lastLSN);
_logger.LogError("Failed to process CDC changes: {Error}", ex.Message);
```

## Security Considerations

### Database Access
- **Principle of Least Privilege**: Read-only access to CDC tables
- **Connection Security**: TLS encryption and certificate validation
- **Credential Management**: Azure Key Vault or managed identity

### Service Bus Security
- **Authentication**: Managed identity or connection strings
- **Authorization**: Topic-level access control
- **Message Security**: Message-level encryption for sensitive data

### Function Security
- **Runtime Security**: Isolated worker process model
- **Secret Management**: Environment variables from Key Vault
- **Network Security**: VNet integration for private resources

## Performance Optimization

### Database Optimization
```sql
-- Index on LSN for efficient range queries
CREATE INDEX IX_CDC_LSN ON cdc.table_CT (__$start_lsn)

-- Cleanup old CDC data regularly
EXEC sys.sp_cdc_cleanup_change_table @capture_instance = 'table_instance'
```

### Function Optimization
```csharp
// Batch processing for better throughput
var batches = changes.Chunk(100);
await Task.WhenAll(batches.Select(ProcessBatch));

// Connection pooling and reuse
private static readonly SqlConnection _connection = new(...);
```

### Service Bus Optimization
```csharp
// Message batching
var messageBatch = await sender.CreateMessageBatchAsync();
foreach (var change in changes) {
    if (!messageBatch.TryAddMessage(new ServiceBusMessage(change))) {
        await sender.SendMessagesAsync(messageBatch);
        messageBatch = await sender.CreateMessageBatchAsync();
    }
}
```

## Best Practices

### Development
1. **Idempotency**: Design consumers to handle duplicate messages
2. **Error Recovery**: Implement dead letter queue handling
3. **Testing**: Unit tests with CDC table mocking
4. **Local Development**: Use SQL Server Express with CDC enabled

### Operations
1. **Deployment**: Blue-green deployment to avoid message loss
2. **Rollback**: Maintain LSN state for rollback scenarios
3. **Monitoring**: Comprehensive logging and alerting
4. **Maintenance**: Regular CDC cleanup and performance tuning

### Troubleshooting
1. **LSN Gaps**: Check for transaction log backup frequency
2. **Message Loss**: Verify Service Bus topic configuration
3. **Performance**: Monitor SQL Server CDC retention and cleanup
4. **Function Failures**: Check Azure Functions runtime logs
