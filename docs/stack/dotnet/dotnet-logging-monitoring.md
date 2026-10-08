# .NET Logging and Monitoring Patterns

**Quick Navigation:**
- **Architecture Hub**: See `dotnet-architecture.md` for complete documentation map
- **Service Patterns**: See `dotnet-service-layer.md` for business operation logging

This document covers essential logging and monitoring patterns for .NET applications in the Briggs System.

## Structured Logging Setup

### Configuration
```csharp
// Program.cs - Basic logging setup
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddApplicationInsights();

// appsettings.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "System": "Warning"
    }
  }
}
```

### Service Registration
```csharp
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddLoggingServices(this IServiceCollection services)
    {
        services.AddLogging(builder =>
        {
            builder.AddConsole(options =>
            {
                options.IncludeScopes = true;
                options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
            });
        });
        
        return services;
    }
}
```

## Logging Patterns

### Controller Logging
```csharp
[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly ILogger<ProjectsController> _logger;
    private readonly IProjectsService _projectsService;

    public ProjectsController(ILogger<ProjectsController> logger, IProjectsService projectsService)
    {
        _logger = logger;
        _projectsService = projectsService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectResponse>>> GetProjects([FromQuery] int domainId)
    {
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["DomainId"] = domainId,
            ["Operation"] = "GetProjects"
        });

        _logger.LogInformation("Getting projects for domain {DomainId}", domainId);

        try
        {
            var projects = await _projectsService.GetProjectsByDomainAsync(domainId);
            _logger.LogInformation("Successfully retrieved {ProjectCount} projects", projects.Count());
            return Ok(projects);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get projects for domain {DomainId}", domainId);
            throw;
        }
    }
}
```

### Service Layer Logging
```csharp
public class ProjectsService : IProjectsService
{
    private readonly ILogger<ProjectsService> _logger;
    private readonly IProjectsRepo _projectsRepo;

    public ProjectsService(ILogger<ProjectsService> logger, IProjectsRepo projectsRepo)
    {
        _logger = logger;
        _projectsRepo = projectsRepo;
    }

    public async Task<IEnumerable<Project>> GetProjectsByDomainAsync(int domainId)
    {
        _logger.LogDebug("Fetching projects from repository for domain {DomainId}", domainId);
        
        var projects = await _projectsRepo.GetByDomainAsync(domainId);
        
        _logger.LogInformation("Retrieved {Count} projects for domain {DomainId}", 
            projects.Count(), domainId);
            
        return projects;
    }

    public async Task<Project> CreateProjectAsync(CreateProjectRequest request, int domainId)
    {
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["DomainId"] = domainId,
            ["ProjectName"] = request.Name
        });

        _logger.LogInformation("Creating new project {ProjectName} in domain {DomainId}", 
            request.Name, domainId);

        try
        {
            var project = await _projectsRepo.CreateAsync(request.ToEntity(domainId));
            
            _logger.LogInformation("Successfully created project {ProjectId} with name {ProjectName}", 
                project.Id, project.Name);
                
            return project;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create project {ProjectName} in domain {DomainId}", 
                request.Name, domainId);
            throw;
        }
    }
}
```

### Repository Logging
```csharp
public class ProjectsRepo : IProjectsRepo
{
    private readonly ILogger<ProjectsRepo> _logger;
    private readonly IDbConnectionFactory _connectionFactory;

    public ProjectsRepo(ILogger<ProjectsRepo> logger, IDbConnectionFactory connectionFactory)
    {
        _logger = logger;
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<Project>> GetByDomainAsync(int domainId)
    {
        _logger.LogDebug("Executing database query for projects in domain {DomainId}", domainId);
        
        using var connection = await _connectionFactory.CreateConnectionAsync();
        
        var stopwatch = Stopwatch.StartNew();
        var projects = await connection.QueryAsync<Project>(
            "SELECT * FROM Projects WHERE DomainId = @DomainId AND IsActive = 1",
            new { DomainId = domainId });
        stopwatch.Stop();
        
        _logger.LogDebug("Database query completed in {ElapsedMs}ms, returned {Count} projects",
            stopwatch.ElapsedMilliseconds, projects.Count());
            
        return projects;
    }
}
```

## Health Checks

### Configuration
```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddSqlServer(connectionString, name: "database")
    .AddCheck<CustomHealthCheck>("custom-check");

// Configure the HTTP request pipeline
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

### Custom Health Check
```csharp
public class DatabaseHealthCheck : IHealthCheck
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ILogger<DatabaseHealthCheck> _logger;

    public DatabaseHealthCheck(IDbConnectionFactory connectionFactory, ILogger<DatabaseHealthCheck> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = await _connectionFactory.CreateConnectionAsync();
            await connection.QuerySingleAsync<int>("SELECT 1");
            
            _logger.LogDebug("Database health check passed");
            return HealthCheckResult.Healthy("Database connection is healthy");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");
            return HealthCheckResult.Unhealthy("Database connection failed", ex);
        }
    }
}
```

## Performance Monitoring

### Action Filter for Timing
```csharp
public class PerformanceLoggingFilter : IActionFilter
{
    private readonly ILogger<PerformanceLoggingFilter> _logger;

    public PerformanceLoggingFilter(ILogger<PerformanceLoggingFilter> logger)
    {
        _logger = logger;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        context.HttpContext.Items["ActionStartTime"] = Stopwatch.StartNew();
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.HttpContext.Items["ActionStartTime"] is Stopwatch stopwatch)
        {
            stopwatch.Stop();
            
            var actionName = $"{context.Controller.GetType().Name}.{context.ActionDescriptor.DisplayName}";
            var elapsedMs = stopwatch.ElapsedMilliseconds;
            
            if (elapsedMs > 1000) // Log slow requests
            {
                _logger.LogWarning("Slow request detected: {ActionName} took {ElapsedMs}ms", 
                    actionName, elapsedMs);
            }
            else
            {
                _logger.LogDebug("Action {ActionName} completed in {ElapsedMs}ms", 
                    actionName, elapsedMs);
            }
        }
    }
}
```

## Error Handling and Logging

### Global Exception Handler
```csharp
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred. RequestPath: {RequestPath}", 
                context.Request.Path);
            
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = exception switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            ValidationException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            _ => StatusCodes.Status500InternalServerError
        };

        var response = new
        {
            error = exception.Message,
            statusCode = context.Response.StatusCode
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
```

## Application Insights Integration

### Configuration
```csharp
// Program.cs
builder.Services.AddApplicationInsightsTelemetry();

// appsettings.json
{
  "ApplicationInsights": {
    "InstrumentationKey": "your-key-here"
  }
}
```

### Custom Telemetry
```csharp
public class ProjectsService : IProjectsService
{
    private readonly TelemetryClient _telemetryClient;

    public async Task<Project> CreateProjectAsync(CreateProjectRequest request, int domainId)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var project = await _projectsRepo.CreateAsync(request.ToEntity(domainId));
            
            // Track success metrics
            _telemetryClient.TrackEvent("ProjectCreated", new Dictionary<string, string>
            {
                ["DomainId"] = domainId.ToString(),
                ["ProjectName"] = request.Name
            });
            
            return project;
        }
        catch (Exception ex)
        {
            // Track failure metrics
            _telemetryClient.TrackException(ex, new Dictionary<string, string>
            {
                ["Operation"] = "CreateProject",
                ["DomainId"] = domainId.ToString()
            });
            throw;
        }
        finally
        {
            stopwatch.Stop();
            _telemetryClient.TrackDependency("Database", "CreateProject", 
                DateTime.UtcNow.Subtract(TimeSpan.FromMilliseconds(stopwatch.ElapsedMilliseconds)), 
                stopwatch.Elapsed, true);
        }
    }
}
```

## Best Practices

### Log Levels
- **Debug**: Detailed diagnostic information
- **Information**: General operational messages
- **Warning**: Potentially harmful situations
- **Error**: Error events that don't stop the application
- **Critical**: Very serious error events

### Security Considerations
```csharp
// DO NOT log sensitive information
_logger.LogInformation("User {UserId} updated project", userId); // ✓ Good
_logger.LogInformation("User {Email} with password {Password}", email, password); // ✗ Bad

// Use structured logging
_logger.LogInformation("Processing {Count} items for domain {DomainId}", count, domainId);
```

### Performance Tips
- Use log scopes for correlated operations
- Implement conditional logging for expensive operations
- Configure appropriate log levels for different environments
- Use structured logging with semantic properties

---

**💡 Pro Tip**: Use structured logging with meaningful properties, implement proper log levels, and ensure sensitive data is never logged. Focus on operational insights and debugging information.
