# .NET Stack - Common Patterns

**CANONICAL SOURCE**: .NET-specific code patterns and integration examples.

## 🔐 **CRITICAL: Authentication Architecture**

> **READ FIRST**: [`../../authentication-architecture-principles.md`](../../authentication-architecture-principles.md)
>
> ❌ **DO NOT** implement JWT validation in .NET services  
> ✅ **DO** extract user context from KrakenD headers

## Controller Patterns

### Standard API Controller
```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IProjectService projectService,
        ILogger<ProjectsController> logger)
    {
        _projectService = projectService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects(
        [FromQuery] string domain,
        [FromQuery] ProjectFilters filters,
        CancellationToken cancellationToken)
    {
        try
        {
            var projects = await _projectService.GetProjectsAsync(
                domain, filters, cancellationToken);
            return Ok(projects);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve projects for domain {Domain}", domain);
            return StatusCode(500, "An error occurred while retrieving projects");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetProject(
        int id, 
        [FromQuery] string domain,
        CancellationToken cancellationToken)
    {
        var project = await _projectService.GetProjectAsync(id, domain, cancellationToken);
        
        if (project == null)
            return NotFound();
            
        return Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> CreateProject(
        [FromBody] CreateProjectDto createDto,
        [FromQuery] string domain,
        CancellationToken cancellationToken)
    {
        var project = await _projectService.CreateProjectAsync(
            createDto, domain, cancellationToken);
        
        return CreatedAtAction(
            nameof(GetProject), 
            new { id = project.Id, domain }, 
            project);
    }
}
```

### Domain-Aware Base Controller
```csharp
[ApiController]
public abstract class DomainAwareController : ControllerBase
{
    protected string GetDomain()
    {
        var domain = Request.Query["domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(domain))
            throw new BadRequestException("Domain parameter is required");
            
        return domain;
    }

    protected string GetUserId()
    {
        // Extract user ID from header set by KrakenD after JWT validation
        var userId = Request.Headers["x-sub"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("User ID not found in request headers");
            
        return userId;
    }

    protected IEnumerable<string> GetUserRoles()
    {
        var rolesHeader = Request.Headers["x-user-roles"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(rolesHeader))
            return Enumerable.Empty<string>();
            
        return rolesHeader.Split(',').Select(r => r.Trim());
    }

    protected List<int> GetUserDomains()
    {
        var domainsHeader = Request.Headers["x-user-domain"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(domainsHeader))
            return new List<int>();
            
        return domainsHeader.Split(',')
            .Select(d => int.TryParse(d.Trim(), out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();
    }
}
```

## Service Layer Patterns

### Service Interface and Implementation
```csharp
// IProjectService.cs
public interface IProjectService
{
    Task<IEnumerable<ProjectDto>> GetProjectsAsync(
        string domain, ProjectFilters filters, CancellationToken cancellationToken);
    Task<ProjectDto?> GetProjectAsync(int id, string domain, CancellationToken cancellationToken);
    Task<ProjectDto> CreateProjectAsync(
        CreateProjectDto createDto, string domain, CancellationToken cancellationToken);
    Task<ProjectDto> UpdateProjectAsync(
        int id, UpdateProjectDto updateDto, string domain, CancellationToken cancellationToken);
    Task DeleteProjectAsync(int id, string domain, CancellationToken cancellationToken);
}

// ProjectService.cs
public class ProjectService : IProjectService
{
    private readonly IProjectRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<ProjectService> _logger;

    public ProjectService(
        IProjectRepository repository,
        IMapper mapper,
        ILogger<ProjectService> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<IEnumerable<ProjectDto>> GetProjectsAsync(
        string domain, ProjectFilters filters, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Retrieving projects for domain {Domain}", domain);
        
        var projects = await _repository.GetByDomainAsync(domain, filters, cancellationToken);
        return _mapper.Map<IEnumerable<ProjectDto>>(projects);
    }

    public async Task<ProjectDto> CreateProjectAsync(
        CreateProjectDto createDto, string domain, CancellationToken cancellationToken)
    {
        var project = _mapper.Map<Project>(createDto);
        project.DomainCode = domain;
        project.CreatedAt = DateTime.UtcNow;

        var createdProject = await _repository.CreateAsync(project, cancellationToken);
        
        _logger.LogInformation("Created project {ProjectId} in domain {Domain}", 
            createdProject.Id, domain);
            
        return _mapper.Map<ProjectDto>(createdProject);
    }
}
```

## Repository Patterns

> 🗄️ **Database Security Requirements**: When implementing repositories, always apply the security patterns documented in:
> - [`databases/database-access-patterns.md`](../../databases/database-access-patterns.md) - Domain filtering requirements
> - [`databases/pttn-database-schema.md`](../../databases/pttn-database-schema.md) - 4-level authorization model
> - [`databases/briggsbase-database-schema.md`](../../databases/briggsbase-database-schema.md) - Plugin configuration access

### Generic Repository Pattern
```csharp
// IRepository.cs
public interface IRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default);
    Task<T> UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

// Repository.cs
public class Repository<T> : IRepository<T> where T : class
{
    protected readonly DbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(DbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.ToListAsync(cancellationToken);
    }

    public virtual async Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public virtual async Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity != null)
        {
            _dbSet.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
```

### Domain-Specific Repository
```csharp
// IProjectRepository.cs
public interface IProjectRepository : IRepository<Project>
{
    Task<IEnumerable<Project>> GetByDomainAsync(
        string domain, ProjectFilters filters, CancellationToken cancellationToken);
    Task<IEnumerable<Project>> GetByUserAsync(
        string userId, string domain, CancellationToken cancellationToken);
}

// ProjectRepository.cs
public class ProjectRepository : Repository<Project>, IProjectRepository
{
    public ProjectRepository(BriggsDbContext context) : base(context) { }

    public async Task<IEnumerable<Project>> GetByDomainAsync(
        string domain, ProjectFilters filters, CancellationToken cancellationToken)
    {
        var query = _dbSet.Where(p => p.DomainCode == domain);

        if (!string.IsNullOrEmpty(filters.Search))
        {
            query = query.Where(p => p.Name.Contains(filters.Search) 
                || p.Description.Contains(filters.Search));
        }

        if (filters.Status != null)
        {
            query = query.Where(p => p.Status == filters.Status);
        }

        return await query
            .Include(p => p.Manager)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Project>> GetByUserAsync(
        string userId, string domain, CancellationToken cancellationToken)
    {
        return await _dbSet
            .Where(p => p.DomainCode == domain && p.ManagerId == userId)
            .Include(p => p.Members)
            .ToListAsync(cancellationToken);
    }
}
```

## Authentication Patterns

> 🔐 **IMPORTANT - KrakenD-Only Authentication**: In the Briggs System architecture, **ONLY KrakenD validates JWT tokens**. Individual .NET services should NOT implement JWT validation. All authentication is handled at the gateway level.
> 
> **Backend services receive pre-authenticated requests from KrakenD with user context in headers (`x-sub`, etc.)**
>
> - [`databases/pttn-database-schema.md`](../../databases/pttn-database-schema.md) - Domain → Account → Project → Office model
> - [`databases/database-access-patterns.md`](../../databases/database-access-patterns.md) - Authorization service patterns
> - [`stack/krakend/krakend-architecture.md`](../krakend/krakend-architecture.md) - Gateway authentication architecture

### User Context Extraction (NOT JWT Validation)
```csharp
// Controllers/BaseController.cs - Extract user context from KrakenD headers
public abstract class BaseController : ControllerBase
{
    protected string GetUserId()
    {
        // KrakenD passes user ID in x-sub header after JWT validation
        return Request.Headers["x-sub"].FirstOrDefault() ?? throw new UnauthorizedAccessException("User context missing");
    }
    
    protected string[] GetUserRoles()
    {
        // KrakenD can pass roles in custom headers if configured
        var rolesHeader = Request.Headers["x-user-roles"].FirstOrDefault();
        return rolesHeader?.Split(',') ?? Array.Empty<string>();
    }
    
    protected string GetUserDomain()
    {
        // Domain information passed by KrakenD
        return Request.Headers["x-user-domain"].FirstOrDefault() ?? "";
    }
}

// Usage in controllers
[ApiController]
[Route("api/[controller]")]
public class ProjectsController : BaseController
{
    [HttpGet]
    public async Task<IActionResult> GetProjects()
    {
        var userId = GetUserId(); // Pre-authenticated by KrakenD
        var domain = GetUserDomain();
        
        // Business logic with authenticated user context
        var projects = await _projectService.GetProjectsForUser(userId, domain);
        return Ok(projects);
    }
}
```

### Domain-Based Authorization Attribute
```csharp
// Attributes/DomainAuthorizeAttribute.cs - Works with KrakenD pre-authenticated context
public class DomainAuthorizeAttribute : Attribute, IAuthorizationFilter
{
    private readonly string[] _requiredRoles;

    public DomainAuthorizeAttribute(params string[] requiredRoles)
    {
        _requiredRoles = requiredRoles;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        // KrakenD already validated authentication - check for user context
        var userId = context.HttpContext.Request.Headers["x-sub"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var domain = context.HttpContext.Request.Query["domain"].FirstOrDefault();
        if (string.IsNullOrEmpty(domain))
        {
            context.Result = new BadRequestObjectResult("Domain parameter is required");
            return;
        }

        // Check if user has access to domain (from KrakenD headers or database lookup)
        var userDomainsHeader = context.HttpContext.Request.Headers["x-user-domains"].FirstOrDefault();
        var userDomains = userDomainsHeader?.Split(',') ?? Array.Empty<string>();
        
        if (!userDomains.Contains(domain))
        {
            context.Result = new ForbidResult();
            return;
        }

        // Check roles if specified (from KrakenD headers)
        if (_requiredRoles?.Length > 0)
        {
            var userRolesHeader = context.HttpContext.Request.Headers["x-user-roles"].FirstOrDefault();
            var userRoles = userRolesHeader?.Split(',') ?? Array.Empty<string>();
            
            if (!_requiredRoles.Any(role => userRoles.Contains(role)))
            {
                context.Result = new ForbidResult();
                return;
            }
        }
    }
}
```

### Usage Example
```csharp
[ApiController]
[Route("api/[controller]")]
public class ProjectsController : BaseController
{
    [HttpGet]
    [DomainAuthorize("projects-user")] // Validates domain access and roles
    public async Task<IActionResult> GetProjects([FromQuery] string domain)
    {
        var userId = GetUserId(); // From KrakenD x-sub header
        var projects = await _projectService.GetProjectsForUserInDomain(userId, domain);
        return Ok(projects);
    }
}
```

## API Gateway Integration

### Gateway HTTP Client
```csharp
// Services/GatewayHttpClient.cs
public interface IGatewayHttpClient
{
    Task<T?> GetAsync<T>(string endpoint, string domain, CancellationToken cancellationToken = default);
    Task<T?> PostAsync<T>(string endpoint, object data, string domain, CancellationToken cancellationToken = default);
}

public class GatewayHttpClient : IGatewayHttpClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GatewayHttpClient> _logger;

    public GatewayHttpClient(HttpClient httpClient, ILogger<GatewayHttpClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string endpoint, string domain, CancellationToken cancellationToken = default)
    {
        // Implementation for GET request
    }

    public async Task<T?> PostAsync<T>(string endpoint, object data, string domain, CancellationToken cancellationToken = default)
    {
        // Implementation for POST request
    }
}
```

---

**💡 Pro Tip**: Use these patterns consistently across the codebase, follow established conventions, and prioritize maintainability over cleverness.
