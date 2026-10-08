# CDC Pattern Implementation Patterns

## Core Implementation Patterns

### 1. Timer-Based Polling Pattern
```csharp
[Function("CdcPollingFunction")]
public async Task Run([TimerTrigger("*/10 * * * * *")] TimerInfo timer)
{
    _logger.LogInformation("Starting CDC Polling...");
    
    try
    {
        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        
        var lastLsn = await GetLastProcessedLsn(conn);
        var changes = await GetCdcChanges(conn, lastLsn);
        
        if (changes.Any())
        {
            await PublishToServiceBus(changes);
            await UpdateLastProcessedLsn(conn, changes.Last().Lsn);
        }
    }
    catch (Exception ex)
    {
        _logger.LogError("CDC processing failed: {Message}", ex.Message);
        throw; // Re-throw for Azure Functions retry
    }
}
```

### 2. LSN Tracking Pattern

> **Live implementations:** `cdc-pttn` uses a single-row `dbo.cdc_offset_tracker(last_lsn binary(10))` with no `table_name`. `cdc-agencysuite` uses `dbo.LsnStates` (`CaptureName`, `LastProcessedLsn varbinary(10)`, `LastUpdatedUtc`). The `table_name` schema below is a multi-table pattern example, not a copy of either repository.

```csharp
// Offset table creation
private async Task EnsureOffsetTrackerTableExists(SqlConnection conn)
{
    var sql = @"
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'cdc_offset_tracker')
        BEGIN
            CREATE TABLE dbo.cdc_offset_tracker(
                table_name NVARCHAR(255) PRIMARY KEY,
                last_lsn BINARY(10) NOT NULL,
                updated_at DATETIME2 DEFAULT GETUTCDATE()
            )
        END";
    
    using var cmd = new SqlCommand(sql, conn);
    await cmd.ExecuteNonQueryAsync();
}

// LSN retrieval and update
private async Task<string> GetLastProcessedLsn(SqlConnection conn, string tableName)
{
    var sql = "SELECT last_lsn FROM dbo.cdc_offset_tracker WHERE table_name = @tableName";
    using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@tableName", tableName);
    
    var result = await cmd.ExecuteScalarAsync();
    return result != null ? Convert.ToHexString((byte[])result) : "0x00000000000000000000";
}
```

### 3. CDC Query Pattern
```csharp
private async Task<List<CdcRecord>> GetCdcChanges(SqlConnection conn, string lastLsn, string tableName)
{
    var sql = @"
        SELECT 
            __$start_lsn,
            __$operation,
            __$update_mask,
            *
        FROM cdc.{0}_CT 
        WHERE __$start_lsn > @lastLsn 
        ORDER BY __$start_lsn, __$seqval";
    
    var formattedSql = string.Format(sql, tableName);
    var records = new List<CdcRecord>();
    
    using var cmd = new SqlCommand(formattedSql, conn);
    cmd.Parameters.AddWithValue("@lastLsn", Convert.FromHexString(lastLsn));
    
    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        records.Add(new CdcRecord
        {
            Lsn = Convert.ToHexString((byte[])reader["__$start_lsn"]),
            Operation = reader["__$operation"].ToString(),
            TableName = tableName,
            Data = SerializeRowData(reader)
        });
    }
    
    return records;
}
```

### 4. Service Bus Publishing Pattern
```csharp
private async Task PublishToServiceBus(IEnumerable<CdcRecord> records)
{
    await using var client = new ServiceBusClient(_serviceBusConnectionString);
    var sendersByTopic = new Dictionary<string, ServiceBusSender>();
    
    try
    {
        foreach (var record in records)
        {
            var topicName = GetTopicName(record.TableName, record.Operation);
            
            if (!sendersByTopic.ContainsKey(topicName))
            {
                sendersByTopic[topicName] = client.CreateSender(topicName);
            }
            
            var message = new ServiceBusMessage(JsonSerializer.Serialize(record))
            {
                MessageId = $"{record.TableName}_{record.Lsn}",
                Subject = record.Operation,
                ApplicationProperties = 
                {
                    ["TableName"] = record.TableName,
                    ["Operation"] = record.Operation,
                    ["LSN"] = record.Lsn
                }
            };
            
            await sendersByTopic[topicName].SendMessageAsync(message);
            _logger.LogInformation("Published {Operation} for {Table} with LSN {LSN}", 
                record.Operation, record.TableName, record.Lsn);
        }
    }
    finally
    {
        foreach (var sender in sendersByTopic.Values)
        {
            await sender.DisposeAsync();
        }
    }
}
```

## Error Handling Patterns

### 1. Transient Error Retry Pattern
```csharp
private async Task<T> ExecuteWithRetry<T>(Func<Task<T>> operation, int maxRetries = 3)
{
    var attempt = 0;
    while (true)
    {
        try
        {
            return await operation();
        }
        catch (Exception ex) when (IsTransientError(ex) && attempt < maxRetries)
        {
            attempt++;
            var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt)); // Exponential backoff
            _logger.LogWarning("Transient error on attempt {Attempt}: {Message}. Retrying in {Delay}s", 
                attempt, ex.Message, delay.TotalSeconds);
            await Task.Delay(delay);
        }
    }
}

private static bool IsTransientError(Exception ex)
{
    return ex is SqlException sqlEx && (
        sqlEx.Number == 2 ||     // Timeout
        sqlEx.Number == 20 ||    // Connection not open
        sqlEx.Number == 64 ||    // Connection lost
        sqlEx.Number == 233      // Connection forcibly closed
    );
}
```

### 2. Dead Letter Queue Pattern
```csharp
private async Task HandleFailedMessage(CdcRecord record, Exception ex)
{
    var deadLetterMessage = new ServiceBusMessage(JsonSerializer.Serialize(new
    {
        OriginalRecord = record,
        Error = ex.Message,
        FailedAt = DateTimeOffset.UtcNow,
        AttemptCount = GetAttemptCount(record)
    }))
    {
        MessageId = $"dlq_{record.TableName}_{record.Lsn}",
        Subject = "failed_processing"
    };
    
    await _deadLetterSender.SendMessageAsync(deadLetterMessage);
    _logger.LogError("Moved message to dead letter queue: {Table}_{LSN}", 
        record.TableName, record.Lsn);
}
```

## Performance Patterns

### 1. Batch Processing Pattern
```csharp
private async Task ProcessCdcChangesBatch(IEnumerable<CdcRecord> changes)
{
    const int batchSize = 100;
    var batches = changes.Chunk(batchSize);
    
    var tasks = batches.Select(async batch =>
    {
        await using var client = new ServiceBusClient(_serviceBusConnectionString);
        var sender = client.CreateSender(GetTopicName(batch.First().TableName));
        
        var messageBatch = await sender.CreateMessageBatchAsync();
        
        foreach (var record in batch)
        {
            var message = new ServiceBusMessage(JsonSerializer.Serialize(record));
            
            if (!messageBatch.TryAddMessage(message))
            {
                await sender.SendMessagesAsync(messageBatch);
                messageBatch = await sender.CreateMessageBatchAsync();
                messageBatch.TryAddMessage(message);
            }
        }
        
        if (messageBatch.Count > 0)
        {
            await sender.SendMessagesAsync(messageBatch);
        }
    });
    
    await Task.WhenAll(tasks);
}
```

### 2. Connection Pooling Pattern
```csharp
public class CdcService : IDisposable
{
    private readonly SqlConnection _connection;
    private readonly ServiceBusClient _serviceBusClient;
    
    public CdcService(string sqlConnectionString, string serviceBusConnectionString)
    {
        _connection = new SqlConnection(sqlConnectionString);
        _serviceBusClient = new ServiceBusClient(serviceBusConnectionString);
    }
    
    public async Task ProcessChangesAsync()
    {
        if (_connection.State != ConnectionState.Open)
        {
            await _connection.OpenAsync();
        }
        
        // Reuse connection for multiple operations
        var lastLsn = await GetLastProcessedLsn(_connection);
        var changes = await GetCdcChanges(_connection, lastLsn);
        await PublishChanges(changes);
    }
    
    public void Dispose()
    {
        _connection?.Dispose();
        _serviceBusClient?.DisposeAsync().AsTask().Wait();
    }
}
```

## Configuration Patterns

### 1. Environment-Based Configuration
```csharp
public class CdcConfiguration
{
    public string SqlConnectionString { get; init; } = 
        Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING") ?? 
        throw new InvalidOperationException("SQL_CONNECTION_STRING not configured");
    
    public string ServiceBusConnectionString { get; init; } = 
        Environment.GetEnvironmentVariable("SERVICE_BUS_CONNECTION_STRING") ?? 
        throw new InvalidOperationException("SERVICE_BUS_CONNECTION_STRING not configured");
    
    public TimeSpan PollingInterval { get; init; } = TimeSpan.FromSeconds(
        int.Parse(Environment.GetEnvironmentVariable("POLLING_INTERVAL_SECONDS") ?? "10"));
    
    public int BatchSize { get; init; } = 
        int.Parse(Environment.GetEnvironmentVariable("BATCH_SIZE") ?? "100");
    
    public string[] MonitoredTables { get; init; } = 
        Environment.GetEnvironmentVariable("MONITORED_TABLES")?.Split(',') ?? 
        Array.Empty<string>();
}
```

### 2. Topic Routing Configuration
```csharp
public class TopicRoutingConfig
{
    private readonly Dictionary<string, string> _tableTopicMapping = new()
    {
        ["users"] = "user_events",
        ["orders"] = "order_events",
        ["inventory"] = "inventory_events"
    };
    
    private readonly Dictionary<string, string> _operationTopicMapping = new()
    {
        ["1"] = "deleted",    // CDC delete operation
        ["2"] = "inserted",   // CDC insert operation
        ["3"] = "updated_before",  // CDC update before
        ["4"] = "updated_after"    // CDC update after
    };
    
    public string GetTopicName(string tableName, string operation)
    {
        var baseTopicName = _tableTopicMapping.GetValueOrDefault(tableName, "unknown_table");
        var operationSuffix = _operationTopicMapping.GetValueOrDefault(operation, "unknown_op");
        
        return $"{baseTopicName}_{operationSuffix}";
    }
}
```

## Testing Patterns

### 1. Unit Testing with Mocks
```csharp
[Test]
public async Task ProcessCdcChanges_WithValidChanges_PublishesToServiceBus()
{
    // Arrange
    var mockConnection = new Mock<IDbConnection>();
    var mockServiceBus = new Mock<IServiceBusClient>();
    var mockSender = new Mock<ServiceBusSender>();
    
    var changes = new List<CdcRecord>
    {
        new() { TableName = "users", Operation = "2", Lsn = "0x123", Data = "{}" }
    };
    
    mockServiceBus.Setup(x => x.CreateSender("user_events_inserted"))
              .Returns(mockSender.Object);
    
    var service = new CdcService(mockConnection.Object, mockServiceBus.Object);
    
    // Act
    await service.ProcessChangesAsync(changes);
    
    // Assert
    mockSender.Verify(x => x.SendMessageAsync(It.IsAny<ServiceBusMessage>()), Times.Once);
}
```

### 2. Integration Testing Pattern
```csharp
[TestFixture]
public class CdcIntegrationTests
{
    private string _testConnectionString;
    private string _testServiceBusConnectionString;
    
    [SetUp]
    public async Task SetUp()
    {
        _testConnectionString = "Server=(localdb)\\mssqllocaldb;Database=CdcTest;";
        _testServiceBusConnectionString = "Endpoint=sb://test.servicebus.windows.net/";
        
        await SetupTestDatabase();
    }
    
    private async Task SetupTestDatabase()
    {
        using var connection = new SqlConnection(_testConnectionString);
        await connection.OpenAsync();
        
        // Enable CDC on test database
        var enableCdcSql = "EXEC sys.sp_cdc_enable_db";
        using var cmd = new SqlCommand(enableCdcSql, connection);
        await cmd.ExecuteNonQueryAsync();
        
        // Create test table and enable CDC
        var createTableSql = @"
            CREATE TABLE test_table (
                id INT IDENTITY PRIMARY KEY,
                name NVARCHAR(100),
                created_at DATETIME2 DEFAULT GETUTCDATE()
            )";
        
        var enableTableCdcSql = @"
            EXEC sys.sp_cdc_enable_table 
                @source_schema = 'dbo',
                @source_name = 'test_table',
                @role_name = NULL";
    }
}
```

## Monitoring Patterns

### 1. Health Check Pattern
```csharp
[Function("CdcHealthCheck")]
public async Task<HttpResponseData> HealthCheck(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req)
{
    var health = new
    {
        Status = "healthy",
        Timestamp = DateTimeOffset.UtcNow,
        Checks = new
        {
            SqlConnection = await TestSqlConnection(),
            ServiceBusConnection = await TestServiceBusConnection(),
            LastProcessedLsn = await GetLastProcessedLsn()
        }
    };
    
    var response = req.CreateResponse(HttpStatusCode.OK);
    await response.WriteAsJsonAsync(health);
    return response;
}
```

### 2. Metrics Collection Pattern
```csharp
private readonly ILogger<CdcPollingFunction> _logger;
private readonly TelemetryClient _telemetryClient;

public async Task ProcessChanges(List<CdcRecord> changes)
{
    var stopwatch = Stopwatch.StartNew();
    
    try
    {
        await PublishToServiceBus(changes);
        
        // Record success metrics
        _telemetryClient.TrackMetric("cdc.changes_processed", changes.Count);
        _telemetryClient.TrackMetric("cdc.processing_duration_ms", stopwatch.ElapsedMilliseconds);
        
        _logger.LogInformation("Processed {Count} CDC changes in {Duration}ms", 
            changes.Count, stopwatch.ElapsedMilliseconds);
    }
    catch (Exception ex)
    {
        _telemetryClient.TrackException(ex);
        _telemetryClient.TrackMetric("cdc.processing_errors", 1);
        throw;
    }
}
```
