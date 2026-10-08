# .NET Dependency Injection Patterns

**Quick Navigation:**
- **Architecture Principles**: See `dotnet-architecture-principles.md` for core concepts
- **Implementation Examples**: See `dotnet-patterns.md` for code patterns
- **Repository Setup**: See `dotnet-repository-patterns.md` for data access DI
- **Service Registration**: This document covers service container setup

This document covers dependency injection patterns, service registration, and container configuration for .NET applications in the Briggs System.

## Table of Contents

1. [Service Registration Patterns](#service-registration-patterns)
2. [Lifetime Management](#lifetime-management)
3. [Extension Methods](#extension-methods)
4. [Configuration Binding](#configuration-binding)
5. [Modern DI Practices](#modern-di-practices)
6. [Common Patterns](#common-patterns)

## Service Registration Patterns

### Organized Extension Methods

Create dedicated service collection extensions for clean DI setup with proper organization:

```csharp
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Infrastructure services
        services.AddHttpClient();
        services.AddScoped<IDatabaseConnectionFactory, DatabaseConnectionFactory>();
        
        // Repository registrations
        services.AddScoped<IProjectsRepo, ProjectsRepo>();
        services.AddScoped<IDomainsRepo, DomainsRepo>();
        
        // Service registrations
        services.AddScoped<IProjectsService, ProjectsService>();
        services.AddScoped<IDomainsService, DomainsService>();
        
        return services;
    }

    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        // Database configuration
        services.Configure<DatabaseOptions>(configuration.GetSection("Database"));
        
        // Health checks
        services.AddHealthChecks()
            .AddSqlServer(configuration.GetConnectionString("DefaultConnection"));
        
        // Logging configuration
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.AddApplicationInsights();
        });
        
        return services;
    }

    public static IServiceCollection AddApiServices(this IServiceCollection services)
    {
        // API versioning
        services.AddApiVersioning(opt =>
        {
            opt.DefaultApiVersion = new Microsoft.AspNetCore.Mvc.ApiVersion(1, 0);
            opt.AssumeDefaultVersionWhenUnspecified = true;
            opt.ReadVersionFromUrlSegment();
        });
        
        // Input validation
        services.AddFluentValidationAutoValidation();
        services.AddValidatorsFromAssemblyContaining<Program>();
        
        // OpenAPI/Swagger
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        
        return services;
    }
}
```

### Program.cs Setup

```csharp
var builder = WebApplication.CreateBuilder(args);

// Register services using extension methods
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApiServices();

// NOTE: Authentication is handled by KrakenD gateway
// No JWT validation configuration needed in .NET services
// User context is provided via headers from the gateway

var app = builder.Build();

// Configure middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
```

## Lifetime Management

### Service Lifetimes

Choose the appropriate lifetime for each service:

#### Scoped Services
Use for services that maintain state per request:

```csharp
// Repository patterns - scoped to request
services.AddScoped<IProjectsRepo, ProjectsRepo>();
services.AddScoped<IProjectsService, ProjectsService>();

// DbContext - scoped to request
services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString), ServiceLifetime.Scoped);
```

#### Singleton Services
Use for stateless services and configuration:

```csharp
// Configuration objects
services.AddSingleton<IConfiguration>(configuration);

// Stateless utilities
services.AddSingleton<IDateTimeProvider, DateTimeProvider>();

// HTTP clients (when using IHttpClientFactory)
services.AddHttpClient<IExternalApiService, ExternalApiService>();
```

#### Transient Services
Use for lightweight, stateless utilities:

```csharp
// Validators
services.AddTransient<IValidator<CreateProjectRequest>, CreateProjectValidator>();

// Lightweight services
services.AddTransient<IPasswordHasher, PasswordHasher>();
```

### Lifetime Guidelines

- **Scoped**: For services that maintain state per request (repositories, business services, DbContext)
- **Singleton**: For stateless services, configuration, and performance-critical shared instances
- **Transient**: For lightweight, stateless utilities and services that should be created fresh each time

## Extension Methods

### Modular Registration

Organize service registration by feature or layer:

```csharp
public static class DatabaseServiceExtensions
{
    public static IServiceCollection AddDatabaseServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Connection factory
        services.AddScoped<IDatabaseConnectionFactory, DatabaseConnectionFactory>();
        
        // Configure connection string
        services.Configure<DatabaseOptions>(
            configuration.GetSection(DatabaseOptions.SectionName));
        
        // Health checks
        services.AddHealthChecks()
            .AddSqlServer(configuration.GetConnectionString("DefaultConnection"));
        
        return services;
    }
}

public static class HeaderValidationServiceExtensions
{
    public static IServiceCollection AddBriggsHeaderValidation(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Note: Authentication is handled by KrakenD gateway
        // Services only need header validation utilities
        services.AddScoped<IHeaderValidationService, HeaderValidationService>();
        services.AddScoped<IDomainValidationService, DomainValidationService>();
        
        return services;
    }
}
```

### Feature-Based Registration

```csharp
public static class ProjectsServiceExtensions
{
    public static IServiceCollection AddProjectsFeature(
        this IServiceCollection services)
    {
        // Repository
        services.AddScoped<IProjectsRepo, ProjectsRepo>();
        
        // Service
        services.AddScoped<IProjectsService, ProjectsService>();
        
        // Validators
        services.AddTransient<IValidator<CreateProjectRequest>, CreateProjectValidator>();
        services.AddTransient<IValidator<UpdateProjectRequest>, UpdateProjectValidator>();
        
        return services;
    }
}
```

## Configuration Binding

### Strongly-Typed Configuration

```csharp
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
```

### Configuration Registration and Validation

```csharp
// Configuration registration with validation
builder.Services.AddOptions<DatabaseOptions>()
    .Bind(builder.Configuration.GetSection(DatabaseOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<ApiOptions>()
    .Bind(builder.Configuration.GetSection(ApiOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Using configuration in services
public class ProjectsRepo
{
    private readonly DatabaseOptions _options;
    
    public ProjectsRepo(IOptions<DatabaseOptions> options)
    {
        _options = options.Value;
    }
}
```

## Modern DI Practices

### Generic Service Registration

```csharp
public static class GenericServiceExtensions
{
    public static IServiceCollection AddRepository<TInterface, TImplementation>(
        this IServiceCollection services)
        where TInterface : class
        where TImplementation : class, TInterface
    {
        return services.AddScoped<TInterface, TImplementation>();
    }
    
    public static IServiceCollection AddRepositories(
        this IServiceCollection services,
        Assembly assembly)
    {
        var repositoryTypes = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract)
            .Where(t => t.Name.EndsWith("Repo"))
            .ToList();
        
        foreach (var implementationType in repositoryTypes)
        {
            var interfaceType = implementationType.GetInterfaces()
                .FirstOrDefault(i => i.Name == $"I{implementationType.Name}");
            
            if (interfaceType != null)
            {
                services.AddScoped(interfaceType, implementationType);
            }
        }
        
        return services;
    }
}
```

### Conditional Registration

```csharp
public static IServiceCollection AddConditionalServices(
    this IServiceCollection services,
    IConfiguration configuration,
    IWebHostEnvironment environment)
{
    // Development-only services
    if (environment.IsDevelopment())
    {
        services.AddTransient<IEmailService, FakeEmailService>();
    }
    else
    {
        services.AddTransient<IEmailService, SmtpEmailService>();
    }
    
    // Feature flag-based registration
    if (configuration.GetValue<bool>("Features:EnableCaching"))
    {
        services.AddMemoryCache();
        services.Decorate<IProjectsService, CachedProjectsService>();
    }
    
    return services;
}
```

### Service Decoration

```csharp
// Install Scrutor package for decoration
public static IServiceCollection AddServiceDecorators(
    this IServiceCollection services)
{
    // Add caching decorator
    services.Decorate<IProjectsService, CachedProjectsService>();
    
    // Add logging decorator
    services.Decorate<IProjectsService, LoggingProjectsService>();
    
    // Add retry decorator
    services.Decorate<IProjectsService, RetryProjectsService>();
    
    return services;
}

public class CachedProjectsService : IProjectsService
{
    private readonly IProjectsService _inner;
    private readonly IMemoryCache _cache;
    
    public CachedProjectsService(IProjectsService inner, IMemoryCache cache)
    {
        _inner = inner;
        _cache = cache;
    }
    
    // Implementation with caching logic
}
```

## Common Patterns

### Factory Pattern Registration

```csharp
public interface IServiceFactory<T>
{
    T Create(string type);
}

public class NotificationServiceFactory : IServiceFactory<INotificationService>
{
    private readonly IServiceProvider _serviceProvider;
    
    public NotificationServiceFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    
    public INotificationService Create(string type) => type.ToLower() switch
    {
        "email" => _serviceProvider.GetRequiredService<EmailNotificationService>(),
        "sms" => _serviceProvider.GetRequiredService<SmsNotificationService>(),
        _ => throw new ArgumentException($"Unknown notification type: {type}")
    };
}

// Registration
services.AddScoped<EmailNotificationService>();
services.AddScoped<SmsNotificationService>();
services.AddScoped<IServiceFactory<INotificationService>, NotificationServiceFactory>();
```

### Options Pattern with Validation

```csharp
public class DatabaseOptionsValidator : IValidateOptions<DatabaseOptions>
{
    public ValidateOptionsResult Validate(string name, DatabaseOptions options)
    {
        var failures = new List<string>();
        
        if (string.IsNullOrEmpty(options.ConnectionString))
        {
            failures.Add("ConnectionString is required");
        }
        
        if (options.CommandTimeoutSeconds <= 0)
        {
            failures.Add("CommandTimeoutSeconds must be positive");
        }
        
        return failures.Any() 
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
}

// Registration
services.AddSingleton<IValidateOptions<DatabaseOptions>, DatabaseOptionsValidator>();
```

---

**Next Steps:**
- See `dotnet-repository-patterns.md` for data access layer setup
- Review `dotnet-service-layer.md` for business logic service patterns
- Check `dotnet-controller-patterns.md` for API controller dependency injection
