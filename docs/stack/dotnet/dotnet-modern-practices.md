# .NET Modern Practices

**🎯 Quick Navigation:**
- **Back to**: [Architecture Hub](dotnet-architecture.md) | [Quick Reference](dotnet-quick-reference.md)
- **Related**: [Logging & Monitoring](dotnet-logging-monitoring.md) | [Testing & Quality](dotnet-testing-quality.md)

This document covers advanced .NET practices including health checks, caching, background services, observability, and modern configuration patterns.

## Health Checks and Monitoring

Implement comprehensive health checks for production monitoring:

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddSqlServer(connectionString, name: "database")
    .AddHttpClient(new Uri("https://external-api.com"), name: "external-service")
    .AddCheck<CustomHealthCheck>("business-logic");

// Custom health check
public class CustomHealthCheck : IHealthCheck
{
    private readonly IProjectsRepo _projectsRepo;

    public CustomHealthCheck(IProjectsRepo projectsRepo)
    {
        _projectsRepo = projectsRepo;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var isHealthy = await _projectsRepo.IsHealthyAsync(cancellationToken);
            return isHealthy 
                ? HealthCheckResult.Healthy("Projects repository is responsive")
                : HealthCheckResult.Unhealthy("Projects repository is not responding");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Projects repository check failed", ex);
        }
    }
}

// Health check endpoints
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
```

## API Rate Limiting and Throttling

```csharp
builder.Services.AddRateLimiter(options =>
{
    // Fixed window rate limiter
    options.AddFixedWindowLimiter("FixedPolicy", limiterOptions =>
    {
        limiterOptions.PermitLimit = 100;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 2;
    });

    // Sliding window rate limiter
    options.AddSlidingWindowLimiter("SlidingPolicy", limiterOptions =>
    {
        limiterOptions.PermitLimit = 100;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.SegmentsPerWindow = 4;
    });

    // Token bucket rate limiter
    options.AddTokenBucketLimiter("TokenPolicy", limiterOptions =>
    {
        limiterOptions.TokenLimit = 100;
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 5;
        limiterOptions.ReplenishmentPeriod = TimeSpan.FromSeconds(10);
        limiterOptions.TokensPerPeriod = 20;
    });
});

app.UseRateLimiter();

// Apply rate limiting to controllers
[EnableRateLimiting("FixedPolicy")]
[ApiController]
public class ProjectsController : ControllerBase
{
    // Controller implementation
}
```

## Caching Strategies

```csharp
// Memory caching
builder.Services.AddMemoryCache();

// Distributed caching
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
});

// Output caching (ASP.NET Core 7+)
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder => builder.Cache());
    options.AddPolicy("ProjectsCache", builder =>
        builder.Cache()
               .Expire(TimeSpan.FromMinutes(10))
               .SetVaryByQuery("domain", "includeQuarters"));
});

app.UseOutputCache();

// Apply caching to endpoints
[OutputCache(PolicyName = "ProjectsCache")]
[HttpGet("{code}")]
public async Task<IActionResult> GetProjectByCodeAsync(string code, string domain)
{
    // Implementation
}

// Cache service pattern
public class CachedProjectsService : IProjectsService
{
    private readonly IProjectsService _inner;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachedProjectsService> _logger;

    public CachedProjectsService(
        IProjectsService inner,
        IMemoryCache cache,
        ILogger<CachedProjectsService> logger)
    {
        _inner = inner;
        _cache = cache;
        _logger = logger;
    }

    public async Task<Result<Project?>> GetProjectByCodeAsync(
        string code, 
        string domain, 
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"project:{code}:{domain}";
        
        if (_cache.TryGetValue(cacheKey, out Project? cachedProject))
        {
            _logger.LogDebug("Cache hit for project {ProjectCode}", code);
            return Result<Project?>.Success(cachedProject);
        }

        var result = await _inner.GetProjectByCodeAsync(code, domain, cancellationToken);
        
        if (result.IsSuccess && result.Value != null)
        {
            _cache.Set(cacheKey, result.Value, TimeSpan.FromMinutes(10));
            _logger.LogDebug("Cached project {ProjectCode}", code);
        }

        return result;
    }
}
```

## Background Services and Hosted Services

```csharp
// Background service for periodic tasks
public class ProjectSyncBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ProjectSyncBackgroundService> _logger;
    private readonly TimeSpan _period = TimeSpan.FromMinutes(30);

    public ProjectSyncBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<ProjectSyncBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_period);
        
        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await SyncProjectsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during project sync");
            }
        }
    }

    private async Task SyncProjectsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var projectsService = scope.ServiceProvider.GetRequiredService<IProjectsService>();
        
        _logger.LogInformation("Starting project synchronization");
        
        // Perform sync operations
        await projectsService.SyncProjectsAsync(cancellationToken);
        
        _logger.LogInformation("Project synchronization completed");
    }
}

// Register background service
builder.Services.AddHostedService<ProjectSyncBackgroundService>();
```

## OpenTelemetry and Observability

```csharp
// Add OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(builder =>
    {
        builder
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddSqlClientInstrumentation()
            .AddConsoleExporter()
            .AddJaegerExporter();
    })
    .WithMetrics(builder =>
    {
        builder
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddPrometheusExporter();
    });

// Custom instrumentation
public class ProjectsService : IProjectsService
{
    private static readonly ActivitySource ActivitySource = new("ProjectsApi");
    private static readonly Counter<int> ProjectsCreatedCounter = 
        Meter.CreateCounter<int>("projects_created_total");

    public async Task<Result<Project>> CreateProjectAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        using var activity = ActivitySource.StartActivity("CreateProject");
        activity?.SetTag("project.code", request.ProjectCode);
        activity?.SetTag("domain.code", request.DomainCode);

        try
        {
            var result = await _projectsRepo.CreateProjectAsync(project, cancellationToken);
            
            if (result.IsSuccess)
            {
                ProjectsCreatedCounter.Add(1, 
                    new KeyValuePair<string, object?>("domain", request.DomainCode));
            }

            return result;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }
}
```

## Modern Configuration Patterns

```csharp
// Strongly-typed configuration
public class DatabaseOptions
{
    public const string SectionName = "Database";
    
    [Required]
    public string ConnectionString { get; set; } = string.Empty;
    
    [Range(1, 300)]
    public int CommandTimeoutSeconds { get; set; } = 30;
    
    public bool EnableRetryOnFailure { get; set; } = true;
    
    [Range(1, 10)]
    public int MaxRetryAttempts { get; set; } = 3;
}

public class ApiOptions
{
    public const string SectionName = "Api";
    
    [Required]
    [Url]
    public string BaseUrl { get; set; } = string.Empty;
    
    public TimeSpan RequestTimeout { get; set; } = TimeSpan.FromSeconds(30);
    
    public RateLimitOptions RateLimit { get; set; } = new();
}

public class RateLimitOptions
{
    public int RequestsPerMinute { get; set; } = 100;
    public int QueueLimit { get; set; } = 5;
}

// Configuration registration and validation
builder.Services.AddOptions<DatabaseOptions>()
    .Bind(builder.Configuration.GetSection(DatabaseOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<ApiOptions>()
    .Bind(builder.Configuration.GetSection(ApiOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Configuration validation middleware
public class ConfigurationValidationMiddleware
{
    private readonly RequestDelegate _next;

    public ConfigurationValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IOptions<DatabaseOptions> dbOptions)
    {
        // Configuration is validated at startup due to ValidateOnStart()
        await _next(context);
    }
}
```

## Enhanced Testing Patterns

```csharp
// Integration test base class
public abstract class IntegrationTestBase : IClassFixture<WebApplicationFactory<Program>>
{
    protected readonly WebApplicationFactory<Program> Factory;
    protected readonly HttpClient Client;

    protected IntegrationTestBase(WebApplicationFactory<Program> factory)
    {
        Factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace services for testing
                services.RemoveAll<IDatabaseConnectionFactory>();
                services.AddSingleton<IDatabaseConnectionFactory, TestDatabaseConnectionFactory>();
            });
        });
        
        Client = Factory.CreateClient();
    }
}

// Test containers for integration tests
public class ProjectsControllerIntegrationTests : IntegrationTestBase
{
    private readonly IContainer _dbContainer;

    public ProjectsControllerIntegrationTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        _dbContainer = new ContainerBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .WithEnvironment("ACCEPT_EULA", "Y")
            .WithEnvironment("MSSQL_SA_PASSWORD", "Test123!")
            .WithPortBinding(1433, true)
            .WithWaitStrategy(Wait.ForUnixContainer().UntilPortIsAvailable(1433))
            .Build();
    }

    [Fact]
    public async Task GetProject_ExistingProject_ReturnsProject()
    {
        // Arrange
        await _dbContainer.StartAsync();
        
        // Act
        var response = await Client.GetAsync("/api/v1/projects/TEST?domain=DOMAIN");
        
        // Assert
        response.EnsureSuccessStatusCode();
        var project = await response.Content.ReadFromJsonAsync<ProjectResponse>();
        Assert.NotNull(project);
        Assert.Equal("TEST", project.ProjectCode);
    }
}
```

## Performance Optimization

### Memory Management

```csharp
// Use ArrayPool for large byte arrays
public class FileProcessingService
{
    private static readonly ArrayPool<byte> ArrayPool = ArrayPool<byte>.Shared;

    public async Task ProcessLargeFileAsync(Stream fileStream)
    {
        var buffer = ArrayPool.Rent(4096);
        try
        {
            int bytesRead;
            while ((bytesRead = await fileStream.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                // Process the buffer
                ProcessBuffer(buffer.AsSpan(0, bytesRead));
            }
        }
        finally
        {
            ArrayPool.Return(buffer);
        }
    }

    private void ProcessBuffer(ReadOnlySpan<byte> buffer)
    {
        // Process the data
    }
}
```

### String Optimization

```csharp
// Use StringBuilder for concatenation, spans for parsing
public class StringOptimizationExamples
{
    public string BuildProjectCode(ReadOnlySpan<char> domain, ReadOnlySpan<char> project)
    {
        // Use string interpolation for simple cases
        if (domain.Length + project.Length < 100)
        {
            return $"{domain.ToString()}-{project.ToString()}";
        }

        // Use StringBuilder for complex concatenation
        var sb = new StringBuilder(domain.Length + project.Length + 1);
        sb.Append(domain);
        sb.Append('-');
        sb.Append(project);
        return sb.ToString();
    }

    public bool ParseProjectCode(ReadOnlySpan<char> input, out ReadOnlySpan<char> domain, out ReadOnlySpan<char> project)
    {
        domain = default;
        project = default;

        var separatorIndex = input.IndexOf('-');
        if (separatorIndex == -1) return false;

        domain = input[..separatorIndex];
        project = input[(separatorIndex + 1)..];
        return true;
    }
}
```

## Security Enhancements

### Secure Configuration

```csharp
// Use Azure Key Vault or similar for secrets
public static class SecureConfigurationExtensions
{
    public static IConfigurationBuilder AddSecureConfiguration(
        this IConfigurationBuilder builder,
        IWebHostEnvironment environment)
    {
        if (environment.IsProduction())
        {
            builder.AddAzureKeyVault(
                new Uri("https://your-keyvault.vault.azure.net/"),
                new DefaultAzureCredential());
        }
        else
        {
            builder.AddUserSecrets<Program>();
        }

        return builder;
    }
}

// Secure headers middleware
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Add("X-Frame-Options", "DENY");
        context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
        
        await _next(context);
    }
}
```

## Best Practices Summary

### Modern .NET Patterns

1. **Use Minimal APIs**: For simple APIs, consider minimal APIs over controllers
2. **Implement Health Checks**: Essential for microservices and containerized applications
3. **Add Rate Limiting**: Protect your APIs from abuse
4. **Use Output Caching**: Improve performance for frequently accessed data
5. **Implement Background Services**: For long-running tasks and periodic jobs
6. **Add Observability**: Use OpenTelemetry for comprehensive monitoring
7. **Secure Configuration**: Use Key Vault for production secrets
8. **Optimize Performance**: Use spans, ArrayPool, and efficient string handling

### Production Readiness

1. **Configuration Validation**: Validate configuration at startup
2. **Graceful Shutdown**: Handle cancellation tokens properly
3. **Error Handling**: Implement global exception handling
4. **Security Headers**: Add security middleware
5. **Container Support**: Design for containerization
6. **Testing Strategy**: Include integration tests with test containers

These modern practices ensure your .NET applications are robust, performant, secure, and maintainable in production environments.
