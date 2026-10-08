# CDC Pattern Troubleshooting Guide

## Common Issues and Solutions

### 1. Function Execution Issues

#### Function Not Triggering
**Symptoms**: Timer function not executing according to schedule
**Causes**: 
- Invalid cron expression
- Function app not running
- Configuration issues

**Solutions**:
```bash
# Check function app status
az functionapp show --name <function-app-name> --resource-group <rg-name>

# Verify timer trigger configuration
[TimerTrigger("*/10 * * * * *")] // Every 10 seconds
[TimerTrigger("0 */5 * * * *")]  // Every 5 minutes

# Test cron expression
# Use https://crontab.guru/ for validation
```

#### Function Execution Timeouts
**Symptoms**: Function terminates after 5-10 minutes
**Causes**: 
- Large batch processing
- Network latency
- Inefficient queries

**Solutions**:
```csharp
// Reduce batch size
const int MAX_BATCH_SIZE = 100;
var batches = changes.Chunk(MAX_BATCH_SIZE);

// Add timeout configuration in host.json
{
  "functionTimeout": "00:10:00",  // 10 minutes max
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  }
}

// Use async operations with cancellation tokens
public async Task ProcessChanges(CancellationToken cancellationToken)
{
    using var conn = new SqlConnection(_connectionString);
    await conn.OpenAsync(cancellationToken);
    // Process with cancellation support
}
```

### 2. Database Connection Issues

#### SQL Connection Failures
**Symptoms**: "Cannot connect to SQL Server" errors
**Causes**:
- Network connectivity
- Firewall rules
- Authentication failures
- Connection string issues

**Solutions**:
```csharp
// Test connection string
private async Task<bool> TestSqlConnection()
{
    try
    {
        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        
        using var cmd = new SqlCommand("SELECT 1", connection);
        await cmd.ExecuteScalarAsync();
        return true;
    }
    catch (Exception ex)
    {
        _logger.LogError("SQL connection test failed: {Message}", ex.Message);
        return false;
    }
}

// Check firewall rules (Azure SQL)
az sql server firewall-rule list --server <server-name> --resource-group <rg-name>

// Add Function App IP to firewall
az sql server firewall-rule create \
  --server <server-name> \
  --resource-group <rg-name> \
  --name AllowFunctionApp \
  --start-ip-address <function-app-ip> \
  --end-ip-address <function-app-ip>
```

#### CDC Not Enabled
**Symptoms**: "Invalid object name 'cdc.table_CT'" errors
**Causes**: 
- CDC not enabled on database
- CDC not enabled on specific tables
- Insufficient permissions

**Solutions**:
```sql
-- Check if CDC is enabled on database
SELECT name, is_cdc_enabled 
FROM sys.databases 
WHERE name = 'YourDatabase'

-- Enable CDC on database (requires sysadmin)
USE YourDatabase
GO
EXEC sys.sp_cdc_enable_db
GO

-- Check CDC enabled tables
SELECT 
    s.name AS schema_name,
    t.name AS table_name,
    c.capture_instance,
    c.start_lsn,
    c.create_date
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN cdc.change_tables c ON t.object_id = c.source_object_id

-- Enable CDC on specific table
EXEC sys.sp_cdc_enable_table
    @source_schema = 'dbo',
    @source_name = 'YourTable',
    @role_name = NULL

-- Grant necessary permissions
GRANT SELECT ON SCHEMA::cdc TO [YourFunctionAppUser]
```

### 3. Service Bus Issues

#### Message Publishing Failures
**Symptoms**: "Unauthorized" or "Message too large" errors
**Causes**:
- Invalid connection string
- Insufficient permissions
- Message size limits
- Topic doesn't exist

**Solutions**:
```csharp
// Test Service Bus connection
private async Task<bool> TestServiceBusConnection()
{
    try
    {
        await using var client = new ServiceBusClient(_serviceBusConnectionString);
        var sender = client.CreateSender("test-topic");
        
        var message = new ServiceBusMessage("test");
        await sender.SendMessageAsync(message);
        return true;
    }
    catch (Exception ex)
    {
        _logger.LogError("Service Bus test failed: {Message}", ex.Message);
        return false;
    }
}

// Check message size limits
const int MAX_MESSAGE_SIZE = 256 * 1024; // 256KB for Standard tier

private ServiceBusMessage CreateMessage(CdcRecord record)
{
    var json = JsonSerializer.Serialize(record);
    var messageSize = Encoding.UTF8.GetByteCount(json);
    
    if (messageSize > MAX_MESSAGE_SIZE)
    {
        _logger.LogWarning("Message too large: {Size} bytes", messageSize);
        // Implement message splitting or compression
        return CreateCompressedMessage(record);
    }
    
    return new ServiceBusMessage(json);
}

// Check topic exists
az servicebus topic show \
  --namespace-name <namespace> \
  --resource-group <rg-name> \
  --name <topic-name>

// Create topic if missing
az servicebus topic create \
  --namespace-name <namespace> \
  --resource-group <rg-name> \
  --name <topic-name>
```

### 4. LSN Tracking Issues

#### LSN Not Advancing
**Symptoms**: Same changes processed repeatedly
**Causes**:
- LSN update transaction failure
- Incorrect LSN format
- Database transaction rollback

**Solutions**:
```csharp
// Ensure atomic LSN updates
private async Task ProcessChangesWithTransaction(SqlConnection conn, List<CdcRecord> changes)
{
    using var transaction = conn.BeginTransaction();
    try
    {
        // Process messages first
        await PublishToServiceBus(changes);
        
        // Update LSN only after successful processing
        await UpdateLastProcessedLsn(conn, changes.Last().Lsn, transaction);
        
        transaction.Commit();
        _logger.LogInformation("Successfully processed {Count} changes", changes.Count);
    }
    catch (Exception ex)
    {
        transaction.Rollback();
        _logger.LogError("Transaction rolled back: {Message}", ex.Message);
        throw;
    }
}

// Validate LSN format
private bool IsValidLsn(string lsn)
{
    return !string.IsNullOrEmpty(lsn) && 
           lsn.Length == 20 && 
           lsn.All(c => char.IsDigit(c) || (c >= 'A' && c <= 'F'));
}
```

#### LSN Gaps or Corruption
**Symptoms**: Missing change events, unexpected LSN values
**Causes**:
- Transaction log backup frequency
- CDC cleanup job issues
- Manual LSN modification

**Solutions**:
```sql
-- Check CDC cleanup configuration
SELECT 
    retention,
    pollinginterval,
    maxtrans,
    maxscans
FROM msdb.dbo.cdc_jobs
WHERE job_type = 'cleanup'

-- Check LSN range availability
SELECT 
    fn_cdc_get_min_lsn('dbo_YourTable') AS min_available_lsn,
    fn_cdc_get_max_lsn() AS max_available_lsn,
    sys.fn_cdc_hextobin('0x' + 'YourStoredLSN') AS your_stored_lsn

-- Reset LSN to current max if corrupted
UPDATE dbo.cdc_offset_tracker 
SET last_lsn = sys.fn_cdc_get_max_lsn()
WHERE table_name = 'YourTable'
```

### 5. Performance Issues

#### High Processing Latency
**Symptoms**: Long delays between change and processing
**Causes**:
- Inefficient CDC queries
- Large batch sizes
- Network latency
- Service Bus throttling

**Solutions**:
```csharp
// Optimize CDC queries with proper indexing
-- Create index on LSN column
CREATE INDEX IX_CDC_LSN ON cdc.YourTable_CT (__$start_lsn)

// Use parameterized queries with proper types
private async Task<List<CdcRecord>> GetCdcChanges(SqlConnection conn, string lastLsn)
{
    var sql = @"
        SELECT TOP 1000 
            __$start_lsn, __$operation, *
        FROM cdc.YourTable_CT 
        WHERE __$start_lsn > @lastLsn 
        ORDER BY __$start_lsn, __$seqval";
    
    using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.Add("@lastLsn", SqlDbType.Binary, 10).Value = Convert.FromHexString(lastLsn);
    
    // Process results...
}

// Implement batch processing with parallel execution
private async Task ProcessChangesInParallel(List<CdcRecord> changes)
{
    const int BATCH_SIZE = 50;
    var batches = changes.Chunk(BATCH_SIZE);
    
    var semaphore = new SemaphoreSlim(Environment.ProcessorCount);
    var tasks = batches.Select(async batch =>
    {
        await semaphore.WaitAsync();
        try
        {
            await ProcessBatch(batch);
        }
        finally
        {
            semaphore.Release();
        }
    });
    
    await Task.WhenAll(tasks);
}
```

#### Memory Issues
**Symptoms**: Out of memory exceptions, high memory usage
**Causes**:
- Large result sets
- Memory leaks
- Inefficient object creation

**Solutions**:
```csharp
// Use streaming for large result sets
private async IAsyncEnumerable<CdcRecord> GetCdcChangesStreaming(
    SqlConnection conn, 
    string lastLsn,
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    var sql = @"
        SELECT __$start_lsn, __$operation, * 
        FROM cdc.YourTable_CT 
        WHERE __$start_lsn > @lastLsn 
        ORDER BY __$start_lsn";
    
    using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@lastLsn", Convert.FromHexString(lastLsn));
    
    using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
    while (await reader.ReadAsync(cancellationToken))
    {
        yield return CreateCdcRecord(reader);
    }
}

// Process streaming results
await foreach (var change in GetCdcChangesStreaming(conn, lastLsn))
{
    await ProcessSingleChange(change);
}

// Proper disposal patterns
public class CdcProcessor : IAsyncDisposable
{
    private readonly SqlConnection _connection;
    private readonly ServiceBusClient _serviceBusClient;
    
    public async ValueTask DisposeAsync()
    {
        if (_connection != null)
            await _connection.DisposeAsync();
            
        if (_serviceBusClient != null)
            await _serviceBusClient.DisposeAsync();
    }
}
```

### 6. Deployment Issues

#### Function Deployment Failures
**Symptoms**: Deployment pipeline failures, function not updating
**Causes**:
- Missing dependencies
- Configuration errors
- Insufficient permissions
- Resource conflicts

**Solutions**:
```bash
# Verify function app configuration
az functionapp config show --name <function-app-name> --resource-group <rg-name>

# Check application settings
az functionapp config appsettings list --name <function-app-name> --resource-group <rg-name>

# Update application settings
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <rg-name> \
  --settings "SQL_CONNECTION_STRING=<connection-string>"

# Check function logs
az functionapp logs tail --name <function-app-name> --resource-group <rg-name>

# Restart function app
az functionapp restart --name <function-app-name> --resource-group <rg-name>
```

## Diagnostic Commands

### Database Diagnostics
```sql
-- Check CDC status and configuration
SELECT 
    DB_NAME() AS database_name,
    is_cdc_enabled,
    collation_name
FROM sys.databases 
WHERE database_id = DB_ID()

-- View CDC capture jobs
SELECT 
    job_id,
    name,
    enabled,
    date_created,
    date_modified
FROM msdb.dbo.sysjobs
WHERE name LIKE '%cdc%'

-- Check CDC table activity
SELECT 
    capture_instance,
    start_lsn,
    end_lsn,
    tran_begin_time,
    tran_end_time,
    tran_id
FROM cdc.lsn_time_mapping
ORDER BY tran_begin_time DESC
```

### Function App Diagnostics
```bash
# Check function app status
az functionapp show --name <function-app-name> --resource-group <rg-name> --query "state"

# View function execution history
az functionapp function logs --name <function-app-name> --resource-group <rg-name> --function-name CdcPollingFunction

# Monitor function metrics
az monitor metrics list \
  --resource <function-app-resource-id> \
  --metric "FunctionExecutionCount,FunctionExecutionUnits" \
  --interval 5m
```

### Service Bus Diagnostics
```bash
# Check Service Bus namespace
az servicebus namespace show --name <namespace> --resource-group <rg-name>

# View topic metrics
az monitor metrics list \
  --resource <topic-resource-id> \
  --metric "IncomingMessages,OutgoingMessages" \
  --interval 5m

# Check dead letter queue
az servicebus topic subscription show \
  --namespace-name <namespace> \
  --resource-group <rg-name> \
  --topic-name <topic-name> \
  --name <subscription-name>
```

## Best Practices for Troubleshooting

1. **Enable Comprehensive Logging**
   ```csharp
   _logger.LogInformation("Processing CDC batch: {Count} changes, LSN range: {Start} to {End}", 
       changes.Count, changes.First().Lsn, changes.Last().Lsn);
   ```

2. **Implement Health Checks**
   ```csharp
   [Function("HealthCheck")]
   public async Task<IActionResult> HealthCheck()
   {
       var health = new
       {
           Status = "healthy",
           SqlConnection = await TestSqlConnection(),
           ServiceBus = await TestServiceBusConnection(),
           LastProcessed = await GetLastProcessedTimestamp()
       };
       return new OkObjectResult(health);
   }
   ```

3. **Monitor Key Metrics**
   - Processing latency
   - Error rates
   - Message throughput
   - LSN advancement rate

4. **Implement Circuit Breakers**
   ```csharp
   private readonly CircuitBreakerPolicy _circuitBreaker = 
       Policy.Handle<Exception>()
             .CircuitBreakerAsync(5, TimeSpan.FromMinutes(1));
   
   public async Task ProcessWithCircuitBreaker()
   {
       await _circuitBreaker.ExecuteAsync(async () =>
       {
           await ProcessCdcChanges();
       });
   }
   ```
