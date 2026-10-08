# .NET Validation and Security Patterns

**Quick Navigation:**
- **Architecture Hub**: See `dotnet-architecture.md` for complete documentation map
- **Controller Patterns**: See `dotnet-controller-patterns.md` for API validation

This document covers essential validation and security patterns for .NET applications in the Briggs System.

## Input Validation

### Basic Model Validation
```csharp
public class CreateProjectRequest
{
    [Required(ErrorMessage = "Project name is required")]
    [StringLength(255, MinimumLength = 2)]
    public required string Name { get; set; }

    [Required]
    public int DomainId { get; set; }

    [EmailAddress]
    public string? CreatedBy { get; set; }
}
```

### FluentValidation Setup
```csharp
// Package: FluentValidation.AspNetCore
public class CreateProjectRequestValidator : AbstractValidator<CreateProjectRequest>
{
    public CreateProjectRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Project name is required")
            .Length(2, 255).WithMessage("Name must be between 2 and 255 characters")
            .Matches(@"^[a-zA-Z0-9\s\-_]+$").WithMessage("Name contains invalid characters");

        RuleFor(x => x.DomainId)
            .GreaterThan(0).WithMessage("Valid domain ID is required");

        RuleFor(x => x.CreatedBy)
            .EmailAddress().When(x => !string.IsNullOrEmpty(x.CreatedBy));
    }
}
```

### Service Registration
```csharp
// Program.cs
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
```

## Authentication & Authorization

### User Context from Headers

**IMPORTANT**: JWT validation is handled exclusively by KrakenD. .NET services receive pre-validated user context through headers.

```csharp
// ✅ CORRECT: Extract user context from headers (no JWT validation in service)
public class SecureController : ControllerBase
{
    [HttpGet]
    public IActionResult GetSecureData()
    {
        // User context provided by KrakenD gateway after JWT validation
        var userId = Request.Headers["x-sub"].FirstOrDefault();
        var userEmail = Request.Headers["x-email"].FirstOrDefault();
        var userRoles = Request.Headers["x-user-roles"].FirstOrDefault()?.Split(',') ?? Array.Empty<string>();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User context not provided by gateway");
        }
        
        return Ok(new { UserId = userId, Email = userEmail, Roles = userRoles });
    }
}
```

### Domain Authorization with Headers
```csharp
[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectResponse>>> GetProjects([FromQuery] int domainId)
    {
        // Extract user context from headers (set by KrakenD after JWT validation)
        var userId = Request.Headers["x-sub"].FirstOrDefault();
        var userDomainsHeader = Request.Headers["x-user-domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User context not provided by gateway");
        }
        
        // Validate domain access from header
        if (!ValidateDomainAccessFromHeader(userDomainsHeader, domainId))
        {
            return Forbid("Access denied to this domain");
        }

        var projects = await _projectsService.GetProjectsByDomainAsync(domainId);
        return Ok(projects);
    }

    private bool ValidateDomainAccessFromHeader(string? domainsHeader, int requestedDomainId)
    {
        if (string.IsNullOrEmpty(domainsHeader))
            return false;
            
        var userDomains = domainsHeader.Split(',')
            .Select(d => int.TryParse(d.Trim(), out var id) ? id : 0)
            .Where(id => id > 0);
            
        return userDomains.Contains(requestedDomainId);
    }
}
```

### Header-based Domain Validation Service
```csharp
public class DomainValidationService
{
    public bool ValidateDomainAccess(HttpRequest request, int requestedDomainId)
    {
        var domainsHeader = request.Headers["x-user-domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(domainsHeader))
            return false;
            
        var userDomains = domainsHeader.Split(',')
            .Select(d => int.TryParse(d.Trim(), out var id) ? id : 0)
            .Where(id => id > 0);
            
        return userDomains.Contains(requestedDomainId);
    }

    public List<int> GetUserDomains(HttpRequest request)
    {
        var domainsHeader = request.Headers["x-user-domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(domainsHeader))
            return new List<int>();
            
        return domainsHeader.Split(',')
            .Select(d => int.TryParse(d.Trim(), out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();
    }
}
```

## Security Middleware

### Request Validation Middleware
```csharp
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers
        context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Add("X-Frame-Options", "DENY");
        context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");

        await _next(context);
    }
}
```

### Rate Limiting
```csharp
// Package: AspNetCoreRateLimit
public class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public RateLimitMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var key = $"rate_limit_{context.Connection.RemoteIpAddress}";
        var requestCount = _cache.Get<int>(key);

        if (requestCount >= 100) // 100 requests per minute
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsync("Too Many Requests");
            return;
        }

        _cache.Set(key, requestCount + 1, TimeSpan.FromMinutes(1));
        await _next(context);
    }
}
```

## Data Protection

### Sensitive Data Handling
```csharp
public class ProjectsService : IProjectsService
{
    private readonly IDataProtector _protector;

    public ProjectsService(IDataProtectionProvider dataProtection)
    {
        _protector = dataProtection.CreateProtector("Projects.Sensitive");
    }

    public async Task<Project> CreateProjectAsync(CreateProjectRequest request, int domainId)
    {
        // Encrypt sensitive data before storage
        var encryptedNotes = string.IsNullOrEmpty(request.Notes) 
            ? null 
            : _protector.Protect(request.Notes);

        var project = new Project
        {
            Name = request.Name,
            DomainId = domainId,
            EncryptedNotes = encryptedNotes
        };

        return await _projectsRepo.CreateAsync(project);
    }

    public async Task<string?> GetDecryptedNotesAsync(int projectId)
    {
        var project = await _projectsRepo.GetByIdAsync(projectId);
        
        return string.IsNullOrEmpty(project?.EncryptedNotes)
            ? null
            : _protector.Unprotect(project.EncryptedNotes);
    }
}
```

### Data Protection Configuration
```csharp
// Program.cs
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(@"./keys/"))
    .SetApplicationName("BriggsSystem")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(90));
```

## Input Sanitization

### HTML Sanitization
```csharp
// Package: HtmlSanitizer
public class SanitizationService
{
    private readonly HtmlSanitizer _sanitizer;

    public SanitizationService()
    {
        _sanitizer = new HtmlSanitizer();
        _sanitizer.AllowedTags.Clear();
        _sanitizer.AllowedTags.Add("p");
        _sanitizer.AllowedTags.Add("br");
        _sanitizer.AllowedTags.Add("strong");
        _sanitizer.AllowedTags.Add("em");
    }

    public string SanitizeHtml(string input)
    {
        return string.IsNullOrEmpty(input) ? string.Empty : _sanitizer.Sanitize(input);
    }

    public string SanitizeText(string input)
    {
        return string.IsNullOrEmpty(input) 
            ? string.Empty 
            : input.Replace("<", "&lt;").Replace(">", "&gt;");
    }
}
```

## Logging Security Events

### Audit Logging
```csharp
public class AuditLogger
{
    private readonly ILogger<AuditLogger> _logger;

    public AuditLogger(ILogger<AuditLogger> logger)
    {
        _logger = logger;
    }

    public void LogSecurityEvent(string userId, string action, string resource, bool success)
    {
        _logger.LogWarning("Security Event: User {UserId} attempted {Action} on {Resource}. Success: {Success}", 
            userId, action, resource, success);
    }

    public void LogDataAccess(string userId, int domainId, string operation, string entity)
    {
        _logger.LogInformation("Data Access: User {UserId} performed {Operation} on {Entity} in domain {DomainId}",
            userId, operation, entity, domainId);
    }
}
```

## CORS Configuration

### CORS Setup
```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins("https://localhost:3000", "https://app.briggssystem.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure the HTTP request pipeline
app.UseCors("AllowedOrigins");
```

## API Key Authentication

### API Key Middleware
```csharp
public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;

    public ApiKeyMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            var apiKey = context.Request.Headers["X-API-Key"].FirstOrDefault();
            var validApiKey = _configuration["ApiKey"];

            if (string.IsNullOrEmpty(apiKey) || apiKey != validApiKey)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Invalid API Key");
                return;
            }
        }

        await _next(context);
    }
}
```

## Best Practices

### Security Checklist
- ✅ Always validate all inputs
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Implement proper authentication and authorization
- ✅ Add security headers
- ✅ Encrypt sensitive data at rest
- ✅ Use HTTPS in production
- ✅ Implement proper error handling (don't expose system details)
- ✅ Log security events for auditing
- ✅ Validate domain access for multi-tenant scenarios

### Common Security Pitfalls
- ❌ Trusting user input without validation
- ❌ Exposing sensitive information in error messages
- ❌ Missing authorization checks
- ❌ Using weak authentication schemes
- ❌ Not implementing proper session management
- ❌ Inadequate logging of security events

### Domain Isolation Security
```csharp
public class DomainSecurityService
{
    public bool ValidateUserDomainAccess(HttpRequest request, int requestedDomainId)
    {
        var domainsHeader = request.Headers["x-user-domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(domainsHeader))
            return false;
            
        var userDomains = domainsHeader.Split(',')
            .Select(d => int.TryParse(d.Trim(), out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();

        return userDomains.Contains(requestedDomainId);
    }

    public IQueryable<T> FilterByUserDomains<T>(IQueryable<T> query, HttpRequest request, Expression<Func<T, int>> domainSelector)
    {
        var userDomains = GetUserDomains(request);
        return query.Where(entity => userDomains.Contains(domainSelector.Compile()(entity)));
    }

    private List<int> GetUserDomains(HttpRequest request)
    {
        var domainsHeader = request.Headers["x-user-domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(domainsHeader))
            return new List<int>();
            
        return domainsHeader.Split(',')
            .Select(d => int.TryParse(d.Trim(), out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();
    }
}
```
```

---

**💡 Pro Tip**: Always validate inputs, implement defense in depth with multiple security layers, and ensure proper domain isolation for multi-tenant security. Log all security-related events for auditing purposes.
