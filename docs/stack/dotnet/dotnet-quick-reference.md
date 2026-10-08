# .NET Stack - Quick Reference

**CANONICAL SOURCE**: .NET-specific ports, environment variables, and configuration.

## 🔐 **CRITICAL: Authentication**

> **NO JWT validation in .NET services**: [`../../authentication-architecture-principles.md`](../../authentication-architecture-principles.md)
>
> Extract user context from KrakenD headers: `Request.Headers["x-sub"]`

## 1. .NET Ports & URLs

| Service | Development | Container | Notes |
|---------|-------------|-----------|--------|
| API (HTTP) | 5000 | 8080 | Development only |
| API (HTTPS) | 5001 | 8080 | HTTPS redirect |
| Production API | 8080 | 8080 | Standard container port |

### Development URLs
```bash
Local API:        http://localhost:5000
Local API HTTPS:  https://localhost:5001
Container API:    http://localhost:8080
Health Check:     http://localhost:8080/health
```

## 2. Environment Variables

### Required Variables
```bash
# Database
ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=BriggsDB;User Id=sa;Password=YourPassword;TrustServerCertificate=true;"

# Gateway Configuration (KrakenD handles authentication)
Gateway__BaseUrl=https://gateway.briggsandwalker.com

# Optional: KrakenD Security Validation
KrakenD__SharedSecret=your-shared-secret-for-request-validation
KrakenD__RequiredHeaders=x-sub,x-user-roles
```

### Optional Variables
```bash
# Logging
Logging__LogLevel__Default=Information
Logging__LogLevel__Microsoft.AspNetCore=Warning

# CORS
Cors__AllowedOrigins__0=http://localhost:3000
Cors__AllowedOrigins__1=http://localhost:5173

# API Configuration
Api__Timeout=30000
Api__MaxRetries=3
```

## 3. Common Commands

### Development
```bash
# Restore dependencies
dotnet restore

# Run application
dotnet run

# Watch for changes
dotnet watch run

# Build application
dotnet build

# Run tests
dotnet test
```

### Database
```bash
# Add migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update

# Generate SQL script
dotnet ef migrations script
```

### Docker
```bash
# Build image
docker build -t app-name .

# Run container
docker run -p 8080:8080 app-name

# Run with environment file
docker run --env-file .env -p 8080:8080 app-name
```

## 4. Configuration Patterns

### appsettings.json Structure
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=BriggsDB;..."
  },
  "Gateway": {
    "BaseUrl": "https://gateway.briggsandwalker.com"
  },
  "KrakenD": {
    "SharedSecret": "your-shared-secret-for-request-validation",
    "RequiredHeaders": ["x-sub", "x-user-roles"]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### Program.cs Setup (KrakenD Gateway Architecture)
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

// 🔐 IMPORTANT: NO JWT authentication setup needed!
// KrakenD handles all authentication - services receive pre-authenticated requests

// Optional: Add custom authorization for business logic
builder.Services.AddScoped<IDomainAuthorizationService, DomainAuthorizationService>();

var app = builder.Build();

// Configure pipeline - NO authentication middleware needed
app.MapControllers();
app.Run();
```

**Key Points:**
- ❌ **DO NOT** add `AddAuthentication()` or `AddJwtBearer()`
- ❌ **DO NOT** add `app.UseAuthentication()`  
- ✅ **DO** extract user context from KrakenD headers (`x-sub`, etc.)
- ✅ **DO** implement business-level authorization as needed
- ✅ **DO** validate requests came through KrakenD (check required headers)

### User Context Extraction Example
```csharp
[ApiController]
[Route("api/[controller]")]
public class ExampleController : ControllerBase
{
    [HttpGet]
    public IActionResult GetUserData()
    {
        // Extract user context from KrakenD headers
        var userId = Request.Headers["x-sub"].FirstOrDefault();
        var userRoles = Request.Headers["x-user-roles"].FirstOrDefault()?.Split(',');
        var userEmail = Request.Headers["x-user-email"].FirstOrDefault();
        
        // Validate request came through KrakenD
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Request must come through KrakenD gateway");
        }
        
        // Use user context for business logic
        return Ok(new { UserId = userId, Roles = userRoles, Email = userEmail });
    }
}
```

## 5. Project Structure

```
src/
├── Controllers/             # API controllers
├── Services/               # Business logic
├── Models/                 # Data models
├── DTOs/                  # Data transfer objects
├── Repositories/          # Data access layer
├── Middleware/            # Custom middleware (e.g., KrakenD validation)
├── Configuration/         # Configuration classes
├── Extensions/            # Extension methods
├── Program.cs             # Application entry point
├── appsettings.json       # Configuration
└── appsettings.Development.json
```

### Optional: KrakenD Request Validation Middleware
```csharp
// Middleware/KrakendValidationMiddleware.cs
public class KrakendValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _config;

    public KrakendValidationMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _config = config;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip validation for health checks
        if (context.Request.Path.StartsWithSegments("/health"))
        {
            await _next(context);
            return;
        }

        // Validate required KrakenD headers are present
        var requiredHeaders = _config.GetSection("KrakenD:RequiredHeaders").Get<string[]>();
        foreach (var header in requiredHeaders ?? new[] { "x-sub" })
        {
            if (!context.Request.Headers.ContainsKey(header))
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Unauthorized: Request must come through KrakenD gateway");
                return;
            }
        }

        await _next(context);
    }
}

// Register in Program.cs:
// app.UseMiddleware<KrakendValidationMiddleware>();
```

## 6. Package References

### Essential Packages
```xml
<!-- Core ASP.NET packages - NO JWT authentication -->
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="7.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="7.0.0" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
```

### Common Additional Packages
```xml
<PackageReference Include="AutoMapper.Extensions.Microsoft.DependencyInjection" Version="12.0.0" />
<PackageReference Include="FluentValidation.AspNetCore" Version="11.3.0" />
<PackageReference Include="Serilog.AspNetCore" Version="6.1.0" />
<PackageReference Include="MediatR.Extensions.Microsoft.DependencyInjection" Version="11.0.0" />
```

### ❌ **AVOID These Packages** (KrakenD handles authentication)
```xml
<!-- DO NOT include - authentication handled by KrakenD -->
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="7.0.0" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.OpenIdConnect" Version="7.0.0" />
```
