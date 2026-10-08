# .NET Controller Patterns

**Quick Navigation:**
- **Architecture Principles**: See `dotnet-architecture-principles.md` for layered architecture
- **Service Layer**: See `dotnet-service-layer.md` for business logic patterns
- **Data Models**: See `dotnet-data-models.md` for DTOs and request/response models
- **Implementation Examples**: See `dotnet-patterns.md` for code patterns
- **ISO Data Standards**: See `../../api-development-standards.md` for **MANDATORY** ISO format requirements

This document covers controller design patterns, API endpoint implementation, and RESTful design for .NET applications in the Briggs System.

> **🚨 CRITICAL**: All APIs must use ISO standardized data formats - see `../../api-development-standards.md`

## Table of Contents

1. [RESTful API Design](#restful-api-design)
2. [Controller Implementation](#controller-implementation)
3. [Minimal API Patterns](#minimal-api-patterns)
4. [Controller Guidelines](#controller-guidelines)
5. [Error Handling](#error-handling)
6. [Authentication & Authorization](#authentication--authorization)

## RESTful API Design

### Standard Controller Pattern

```csharp
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/projects")]
[Produces("application/json")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectsService _projectsService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(IProjectsService projectsService, ILogger<ProjectsController> logger)
    {
        _projectsService = projectsService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves a project by code and domain
    /// </summary>
    /// <param name="code">The project code</param>
    /// <param name="domain">The domain code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The project details</returns>
    [HttpGet("{code}")]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProjectResponse>> GetProjectByCodeAsync(
        string code,
        [FromQuery] string domain,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(domain))
        {
            return BadRequest("Domain parameter is required");
        }

        var result = await _projectsService.GetProjectByCodeAsync(code, domain, cancellationToken);
        
        if (!result.IsSuccess)
        {
            _logger.LogWarning("Failed to retrieve project {ProjectCode}: {Error}", code, result.Error);
            return BadRequest(result.Error);
        }
        
        if (result.Value == null)
        {
            return NotFound($"Project {code} not found in domain {domain}");
        }
        
        var response = _mapper.Map<ProjectResponse>(result.Value);
        return Ok(response);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProjectResponse>> CreateProjectAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _projectsService.CreateProjectAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
        {
            return BadRequest(result.Error);
        }
        
        var response = _mapper.Map<ProjectResponse>(result.Value);
        return CreatedAtAction(
            nameof(GetProjectByCodeAsync),
            new { code = response.ProjectCode, domain = response.DomainCode },
            response);
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

    protected bool HasRole(string role)
    {
        return GetUserRoles().Contains(role, StringComparer.OrdinalIgnoreCase);
    }

    protected ActionResult<T> HandleServiceResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return result.Value == null ? NotFound() : Ok(result.Value);
        }
        
        return BadRequest(result.Error);
    }
}

// Usage example
[Route("api/v{version:apiVersion}/projects")]
public class ProjectsController : DomainAwareController
{
    private readonly IProjectsService _projectsService;

    [HttpGet("{code}")]
    public async Task<ActionResult<ProjectResponse>> GetProjectAsync(string code)
    {
        var domain = GetDomain(); // Automatically validates domain parameter
        var result = await _projectsService.GetProjectByCodeAsync(code, domain);
        return HandleServiceResult(result); // Standardized response handling
    }
}
```

## Controller Implementation

### CRUD Operations Pattern

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
public class ProjectsController : DomainAwareController
{
    private readonly IProjectsService _projectsService;
    private readonly IMapper _mapper;

    // GET api/v1/projects?domain=CLIENT-A
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectResponse>>> GetProjectsAsync(
        [FromQuery] string domain,
        [FromQuery] ProjectFilters? filters = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _projectsService.GetProjectsByDomainAsync(domain, filters, cancellationToken);
        return HandleServiceResult(result);
    }

    // GET api/v1/projects/{code}?domain=CLIENT-A
    [HttpGet("{code}")]
    public async Task<ActionResult<ProjectResponse>> GetProjectAsync(
        string code,
        [FromQuery] string domain,
        CancellationToken cancellationToken = default)
    {
        var result = await _projectsService.GetProjectByCodeAsync(code, domain, cancellationToken);
        return HandleServiceResult(result);
    }

    // POST api/v1/projects
    [HttpPost]
    public async Task<ActionResult<ProjectResponse>> CreateProjectAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _projectsService.CreateProjectAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);
            
        var response = _mapper.Map<ProjectResponse>(result.Value);
        return CreatedAtAction(nameof(GetProjectAsync), 
            new { code = response.ProjectCode, domain = response.DomainCode }, 
            response);
    }

    // PUT api/v1/projects/{code}?domain=CLIENT-A
    [HttpPut("{code}")]
    public async Task<ActionResult<ProjectResponse>> UpdateProjectAsync(
        string code,
        [FromQuery] string domain,
        UpdateProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _projectsService.UpdateProjectAsync(code, domain, request, cancellationToken);
        return HandleServiceResult(result);
    }

    // DELETE api/v1/projects/{code}?domain=CLIENT-A
    [HttpDelete("{code}")]
    public async Task<ActionResult> DeleteProjectAsync(
        string code,
        [FromQuery] string domain,
        CancellationToken cancellationToken = default)
    {
        var result = await _projectsService.DeleteProjectAsync(code, domain, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);
            
        return NoContent();
    }
}
```

### Search and Filtering

```csharp
[HttpGet("search")]
public async Task<ActionResult<PagedResponse<ProjectResponse>>> SearchProjectsAsync(
    [FromQuery] ProjectSearchRequest request,
    CancellationToken cancellationToken = default)
{
    var criteria = _mapper.Map<ProjectSearchCriteria>(request);
    var result = await _projectsService.SearchProjectsAsync(criteria, cancellationToken);
    
    if (!result.IsSuccess)
        return BadRequest(result.Error);
        
    var pagedResponse = new PagedResponse<ProjectResponse>
    {
        Data = _mapper.Map<IEnumerable<ProjectResponse>>(result.Value.Data),
        TotalCount = result.Value.TotalCount,
        PageSize = request.PageSize,
        CurrentPage = request.Page
    };
    
    return Ok(pagedResponse);
}

public class ProjectSearchRequest
{
    public string? Domain { get; set; }
    public string? SearchTerm { get; set; }
    public bool IncludeInactive { get; set; } = false;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; } = "asc";
}
```

## Minimal API Patterns

### Alternative to Traditional Controllers

```csharp
public static class ProjectsEndpoints
{
    public static void MapProjectsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/projects")
            .WithTags("Projects")
            .WithOpenApi();

        group.MapGet("/{code}", GetProjectByCodeAsync)
            .WithName("GetProjectByCode")
            .WithSummary("Get project by code")
            .Produces<ProjectResponse>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateProjectAsync)
            .WithName("CreateProject")
            .WithSummary("Create a new project")
            .Produces<ProjectResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        group.MapPut("/{code}", UpdateProjectAsync)
            .WithName("UpdateProject")
            .Produces<ProjectResponse>()
            .ProducesValidationProblem();

        group.MapDelete("/{code}", DeleteProjectAsync)
            .WithName("DeleteProject")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static async Task<Results<Ok<ProjectResponse>, NotFound, BadRequest<ProblemDetails>>> 
        GetProjectByCodeAsync(
            string code,
            [FromQuery] string domain,
            IProjectsService projectsService,
            IMapper mapper,
            CancellationToken cancellationToken)
    {
        var result = await projectsService.GetProjectByCodeAsync(code, domain, cancellationToken);
        
        if (!result.IsSuccess)
        {
            return TypedResults.BadRequest(new ProblemDetails 
            { 
                Title = "Error retrieving project",
                Detail = result.Error 
            });
        }
        
        if (result.Value == null)
        {
            return TypedResults.NotFound();
        }
            
        var response = mapper.Map<ProjectResponse>(result.Value);
        return TypedResults.Ok(response);
    }

    private static async Task<Results<Created<ProjectResponse>, BadRequest<ProblemDetails>>>
        CreateProjectAsync(
            CreateProjectRequest request,
            IProjectsService projectsService,
            IMapper mapper,
            CancellationToken cancellationToken)
    {
        var result = await projectsService.CreateProjectAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
        {
            return TypedResults.BadRequest(new ProblemDetails
            {
                Title = "Error creating project",
                Detail = result.Error
            });
        }
        
        var response = mapper.Map<ProjectResponse>(result.Value);
        return TypedResults.Created($"/api/v1/projects/{response.ProjectCode}?domain={response.DomainCode}", response);
    }
}

// Registration in Program.cs
app.MapProjectsEndpoints();
```

## Controller Guidelines

### Best Practices

1. **Thin Controllers**: Minimal logic, delegate to services
2. **Proper HTTP Status Codes**: Use appropriate status codes with typed responses
3. **Input Validation**: Use model binding, data annotations, and FluentValidation
4. **Error Handling**: Return structured error responses using ProblemDetails
5. **Async Actions**: All actions should be asynchronous with CancellationToken support
6. **API Versioning**: Implement proper API versioning strategy
7. **OpenAPI Documentation**: Use XML comments and attributes for API documentation
8. **Response Types**: Specify response types for better OpenAPI generation

### Response Type Patterns

```csharp
[HttpGet("{id}")]
[ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
public async Task<ActionResult<ProjectResponse>> GetProjectAsync(int id)
{
    // Implementation
}

// Using Results<T> for better type safety (Minimal APIs)
public static async Task<Results<Ok<ProjectResponse>, NotFound, BadRequest<ProblemDetails>>>
    GetProjectAsync(int id, IProjectsService service)
{


---

**💡 Pro Tip**: Keep controllers thin, focus on HTTP concerns, use proper status codes, and implement consistent error handling across all endpoints.
