# .NET Stack - Troubleshooting

**PROBLEM-SOLVING FOCUS**: .NET-specific solutions and debugging.

## Authentication Issues

> 🔐 **ARCHITECTURE NOTE**: In Briggs System, individual .NET services do NOT validate JWT tokens. All authentication is handled by KrakenD Gateway. Services receive pre-authenticated requests with user context in headers.

### Problem: Missing user context from KrakenD
**Symptoms:**
- 401 Unauthorized responses from API
- "User context missing" errors
- Service can't identify authenticated user

**Solutions:**
```bash
# 1. Verify KrakenD is passing user context headers
# Check your service receives these headers from KrakenD:
curl -H "x-sub: user123" \
     -H "x-user-domain: domain1" \
     http://localhost:8080/api/health

# 2. Check KrakenD configuration for claim propagation
# In krakend.json auth/validator section:
{
  "auth/validator": {
    "propagate_claims": [
      ["sub", "x-sub"],
      ["domain", "x-user-domain"],
      ["realm_access.roles", "x-user-roles"]
    ]
  }
}

# 3. Debug headers received by service
# Add logging in your controller to see what headers KrakenD sends:
public class DebugController : ControllerBase
{
    [HttpGet("headers")]
    public IActionResult GetHeaders()
    {
        var headers = Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString());
        return Ok(headers);
    }
}

# 4. Test KrakenD → Service communication
# Verify KrakenD can reach your service:
curl http://krakend:8080/api/your-service/health
```

### Problem: Service not reachable from KrakenD
**Symptoms:**
- KrakenD returns 502 Bad Gateway
- "Connection refused" in KrakenD logs
- Service works directly but not through gateway

**Solutions:**
```bash
# 1. Verify service is listening on correct port
netstat -tlnp | grep :8080
docker ps | grep your-service

# 2. Check Docker network connectivity
# From KrakenD container, test service connectivity:
docker exec -it krakend-container wget -O- http://your-service:8080/health

# 3. Verify service discovery configuration
# In krakend.json backend configuration:
{
  "backend": [
    {
      "host": ["http://your-service:8080"],  # Must match service name
      "url_pattern": "/api/endpoint"
    }
  ]
}

# 4. Check service health endpoint
curl http://your-service:8080/health

# 5. Verify container networking in docker-compose
services:
  your-service:
    container_name: your-service    # Must match krakend.json host
    ports:
      - "8080:8080"
    networks:
      - briggs-network              # Same network as KrakenD
```

## Database Issues

### Problem: Entity Framework connection fails
**Symptoms:**
- "Cannot open database" errors
- Connection timeout exceptions
- Database queries hanging

**Solutions:**
```bash
# 1. Check connection string format
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost,1433;Database=BriggsDB;User Id=sa;Password=YourPassword;TrustServerCertificate=true;ConnectRetryCount=0;"
}

# 2. Test SQL Server connectivity
sqlcmd -S localhost,1433 -U sa -P YourPassword

# 3. Check Docker SQL Server container
docker ps | grep sql
docker logs sql-server-container-name

# 4. Verify database exists
dotnet ef database update

# 5. Check for migration issues
dotnet ef migrations list
dotnet ef database drop  # Only in development!
dotnet ef database update
```

### Problem: Migration fails
**Symptoms:**
- "Migration already applied" errors
- Schema conflicts
- Foreign key constraint failures

**Solutions:**
```bash
# 1. Check migration status
dotnet ef migrations list

# 2. Remove problematic migration
dotnet ef migrations remove

# 3. Reset migrations (development only!)
dotnet ef database drop
rm -rf Migrations/
dotnet ef migrations add InitialCreate
dotnet ef database update

# 4. Generate SQL script for manual review
dotnet ef migrations script > migration.sql
```

## API Issues

### Problem: Controller returns 404 for valid routes
**Symptoms:**
- API endpoints returning 404
- Swagger shows endpoints but they're unreachable
- Route parameters not being matched

**Solutions:**
```csharp
// 1. Check controller attribute configuration
[ApiController]
[Route("api/v1/[controller]")]  // Should generate /api/v1/projects
public class ProjectsController : ControllerBase

// 2. Verify action method attributes
[HttpGet]                           // GET /api/v1/projects
[HttpGet("{id}")]                  // GET /api/v1/projects/123
[HttpGet("{id}/details")]          // GET /api/v1/projects/123/details

// 3. Check parameter binding
public async Task<ActionResult> GetProject(
    [FromRoute] int id,            // From URL path
    [FromQuery] string domain      // From query string
)

// 4. Enable routing debug logging
"Logging": {
  "LogLevel": {
    "Microsoft.AspNetCore.Routing": "Debug"
  }
}
```

### Problem: Model binding fails
**Symptoms:**
- Request parameters are null or default values
- Complex objects not populated from request
- Validation errors for valid data

**Solutions:**
```csharp
// 1. Check parameter source attributes
public async Task<ActionResult> CreateProject(
    [FromBody] CreateProjectDto dto,        // From request body (JSON)
    [FromQuery] string domain,              // From query string
    [FromRoute] int id,                     // From URL path
    [FromHeader] string authorization       // From headers
)

// 2. Verify DTO property names match JSON
public class CreateProjectDto
{
    [JsonPropertyName("project_name")]      // Maps to project_name in JSON
    public string Name { get; set; }
    
    public string Description { get; set; } // Maps to description (camelCase auto)
}

// 3. Check content type
// Ensure requests use: Content-Type: application/json

// 4. Enable model binding debug logging
"Logging": {
  "LogLevel": {
    "Microsoft.AspNetCore.Mvc.ModelBinding": "Debug"
  }
}
```

## Performance Issues

### Problem: Slow database queries
**Symptoms:**
- API responses taking several seconds
- Database timeout exceptions
- High CPU usage on database server

**Solutions:**
```csharp
// 1. Add proper indexes
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Project>()
        .HasIndex(p => p.DomainCode)        // Index for domain filtering
        .HasDatabaseName("IX_Projects_DomainCode");
        
    modelBuilder.Entity<Project>()
        .HasIndex(p => new { p.DomainCode, p.Status })  // Composite index
        .HasDatabaseName("IX_Projects_Domain_Status");
}

// 2. Use async methods consistently
public async Task<Project?> GetProjectAsync(int id, CancellationToken cancellationToken)
{
    return await _context.Projects
        .Include(p => p.Manager)            // Only include needed relations
        .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
}

// 3. Implement pagination
public async Task<PagedResult<Project>> GetProjectsAsync(
    string domain, int page, int pageSize, CancellationToken cancellationToken)
{
    var query = _context.Projects.Where(p => p.DomainCode == domain);
    
    var total = await query.CountAsync(cancellationToken);
    var projects = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync(cancellationToken);
        
    return new PagedResult<Project>(projects, total, page, pageSize);
}

// 4. Enable query logging to identify slow queries
"Logging": {
  "LogLevel": {
    "Microsoft.EntityFrameworkCore.Database.Command": "Information"
  }
}
```

### Problem: Memory leaks or high memory usage
**Symptoms:**
- Application memory usage keeps growing
- OutOfMemoryException errors
- Slow response times over time

**Solutions:**
```csharp
// 1. Dispose DbContext properly (handled by DI)
// Ensure services are registered with correct lifetime:
builder.Services.AddDbContext<BriggsDbContext>(options => 
    options.UseSqlServer(connectionString));  // Scoped by default

// 2. Use streaming for large datasets
public async IAsyncEnumerable<Project> GetProjectsStreamAsync(
    string domain, 
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    await foreach (var project in _context.Projects
        .Where(p => p.DomainCode == domain)
        .AsAsyncEnumerable()
        .WithCancellation(cancellationToken))
    {
        yield return project;
    }
}

// 3. Implement caching for expensive operations
builder.Services.AddMemoryCache();

public async Task<Project?> GetProjectWithCacheAsync(int id)
{
    return await _cache.GetOrCreateAsync($"project_{id}", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
        return await _repository.GetByIdAsync(id);
    });
}
```

## Configuration Issues

### Problem: Environment variables not loading
**Symptoms:**
- Configuration values are null or default
- Environment-specific settings not applied
- Application uses wrong database/API endpoints

**Solutions:**
```bash
# 1. Check environment variable naming
# Use double underscore for nested configuration:
export ConnectionStrings__DefaultConnection="Server=..."
export Keycloak__Authority="https://..."

# 2. Verify appsettings hierarchy
# Files are loaded in this order:
# - appsettings.json
# - appsettings.{Environment}.json
# - Environment variables
# - Command line arguments

# 3. Check ASPNETCORE_ENVIRONMENT
echo $ASPNETCORE_ENVIRONMENT
# Should be: Development, Staging, or Production

# 4. Test configuration in code
public class DebugController : ControllerBase
{
    private readonly IConfiguration _configuration;
    
    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        return Ok(new {
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            ConnectionString = _configuration.GetConnectionString("DefaultConnection"),
            KeycloakAuthority = _configuration["Keycloak:Authority"]
        });
    }
}
```

## Build and Deployment Issues

### Problem: Docker build fails
**Symptoms:**
- "COPY failed" errors in Docker build
- Missing dependencies in container
- Application fails to start in container

**Solutions:**
```dockerfile
# 1. Check Dockerfile layer order
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

# Copy project files first (better caching)
COPY ["YourProject.csproj", "./"]
RUN dotnet restore

# Then copy source code
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "YourProject.dll"]

# 2. Check .dockerignore file
bin/
obj/
.git/
.vs/
```

### Problem: Application fails to start in production
**Symptoms:**
- Application exits immediately
- "Failed to start application" errors
- Missing configuration or dependencies

**Solutions:**
```bash
# 1. Check logs
docker logs container-name

# 2. Test locally with production configuration
export ASPNETCORE_ENVIRONMENT=Production
dotnet run

# 3. Verify required environment variables are set
# Check these are configured:
export ConnectionStrings__DefaultConnection="..."
export Keycloak__Authority="..."
export Keycloak__Audience="..."

# 4. Test database connectivity from container
docker exec -it container-name /bin/bash
# Then test connection string

# 5. Check startup order in docker-compose
version: '3.8'
services:
  api:
    depends_on:
      - database
    environment:
      - ConnectionStrings__DefaultConnection=...
```
