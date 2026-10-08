# .NET Data Models and DTOs

**Quick Navigation:**
- **Architecture Principles**: See `dotnet-architecture-principles.md` for domain modeling concepts
- **Repository Layer**: See `dotnet-repository-patterns.md` for entity definitions
- **Service Layer**: See `dotnet-service-layer.md` for business logic models
- **Controller Layer**: See `dotnet-controller-patterns.md` for API request/response patterns
- **ISO Data Standards**: See `../../api-development-standards.md` for **MANDATORY** ISO format requirements

This document covers data model design, DTOs, domain entities, and mapping patterns for .NET applications in the Briggs System.

> **🚨 CRITICAL**: All data models must use ISO standardized formats - see `../../api-development-standards.md`

## Table of Contents

1. [Model Organization](#model-organization)
2. [Domain Models](#domain-models)
3. [Request/Response DTOs](#requestresponse-dtos)
4. [Mapping Patterns](#mapping-patterns)
5. [Validation Models](#validation-models)
6. [Value Objects](#value-objects)

## Model Organization

### Folder Structure

Separate concerns with different model types:

```
Models/
├── Domain/              # Core business entities
│   ├── Project.cs
│   ├── Domain.cs
│   └── ProjectTeam.cs
├── Requests/            # API input models
│   ├── CreateProjectRequest.cs
│   ├── UpdateProjectRequest.cs
│   └── ProjectSearchRequest.cs
├── Responses/           # API output models
│   ├── ProjectResponse.cs
│   ├── DomainResponse.cs
│   └── PagedResponse.cs
├── Common/              # Shared models
│   ├── Result.cs
│   ├── PagedResult.cs
│   └── ErrorDetails.cs
└── ValueObjects/        # Value objects
    ├── ProjectCode.cs
    ├── DomainCode.cs
    └── EmailAddress.cs
```

### Model Types

- **Domain Models**: Core business entities with behavior
- **Request Models**: API input models with validation
- **Response Models**: API output models optimized for consumption
- **Common Models**: Shared across multiple features
- **Value Objects**: Immutable types representing concepts

## Domain Models

### Rich Domain Models with Behavior

```csharp
public class Project
{
    public required string ProjectCode { get; set; }
    public required string DomainCode { get; set; }
    public string? ProjectName { get; set; }
    public ProjectStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation properties
    public virtual Domain Domain { get; set; } = null!;
    public virtual ICollection<ProjectTeam> Teams { get; set; } = new List<ProjectTeam>();

    // Domain methods
    public void Activate(string activatedBy)
    {
        if (Status == ProjectStatus.Active)
            throw new InvalidOperationException("Project is already active");
            
        Status = ProjectStatus.Active;
        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = activatedBy;
    }

    public void Deactivate(string deactivatedBy)
    {
        if (Status == ProjectStatus.Inactive)
            throw new InvalidOperationException("Project is already inactive");
            
        Status = ProjectStatus.Inactive;
        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = deactivatedBy;
    }

    public bool CanBeActivated() => Status is ProjectStatus.Draft or ProjectStatus.Inactive;
    public bool CanBeDeleted() => Status != ProjectStatus.Active;
    public bool HasTeams() => Teams.Any();

    public void AddTeam(ProjectTeam team)
    {
        if (Teams.Any(t => t.TeamCode == team.TeamCode))
            throw new InvalidOperationException($"Team {team.TeamCode} already exists in project");
            
        Teams.Add(team);
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum ProjectStatus
{
    Draft,
    Active,
    Inactive,
    Completed,
    Cancelled
}
```

### Entity with Validation

```csharp
public class Domain
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsGlobal { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }

    // Navigation properties
    public virtual ICollection<Project> Projects { get; set; } = new List<Project>();

    // Business rules
    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Code))
            throw new ValidationException("Domain code is required");
            
        if (Code.Length < 2 || Code.Length > 20)
            throw new ValidationException("Domain code must be between 2 and 20 characters");
            
        if (string.IsNullOrWhiteSpace(Name))
            throw new ValidationException("Domain name is required");
    }

    public bool CanCreateProjects() => IsActive;
    public int GetActiveProjectCount() => Projects.Count(p => p.Status == ProjectStatus.Active);
}
```

## Request/Response DTOs

### Request Models with Validation

```csharp
public class CreateProjectRequest
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    [JsonPropertyName("projectCode")]
    public required string ProjectCode { get; set; }

    [Required]
    [StringLength(10, MinimumLength = 2)]
    [JsonPropertyName("domainCode")]
    public required string DomainCode { get; set; }
    
    [StringLength(200)]
    [JsonPropertyName("projectName")]
    public string? ProjectName { get; set; }

    [JsonPropertyName("createdBy")]
    public string? CreatedBy { get; set; }

    // Custom validation method
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ProjectCode?.ToUpper() != ProjectCode)
        {
            yield return new ValidationResult(
                "Project code must be uppercase",
                new[] { nameof(ProjectCode) });
        }

        if (DomainCode?.ToUpper() != DomainCode)
        {
            yield return new ValidationResult(
                "Domain code must be uppercase",
                new[] { nameof(DomainCode) });
        }
    }
}

public class UpdateProjectRequest
{
    [StringLength(200)]
    [JsonPropertyName("projectName")]
    public string? ProjectName { get; set; }

    [JsonPropertyName("status")]
    public ProjectStatus? Status { get; set; }

    [JsonPropertyName("updatedBy")]
    public string? UpdatedBy { get; set; }
}

public class ProjectSearchRequest
{
    [JsonPropertyName("domain")]
    public string? Domain { get; set; }

    [JsonPropertyName("searchTerm")]
    public string? SearchTerm { get; set; }

    [JsonPropertyName("status")]
    public ProjectStatus? Status { get; set; }

    [JsonPropertyName("includeInactive")]
    public bool IncludeInactive { get; set; } = false;

    [Range(1, int.MaxValue)]
    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; } = 20;

    [JsonPropertyName("sortBy")]
    public string? SortBy { get; set; }

    [JsonPropertyName("sortDirection")]
    public string SortDirection { get; set; } = "asc";
}
```

### Response Models

```csharp
// Response Model
public record ProjectResponse(
    [property: JsonPropertyName("projectCode")] string ProjectCode,
    [property: JsonPropertyName("domainCode")] string DomainCode,
    [property: JsonPropertyName("projectName")] string? ProjectName,
    [property: JsonPropertyName("status")] ProjectStatus Status,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("updatedAt")] DateTime? UpdatedAt,
    [property: JsonPropertyName("teamCount")] int TeamCount,
    [property: JsonPropertyName("canBeActivated")] bool CanBeActivated);

// Detailed response with nested data
public record ProjectDetailResponse(
    [property: JsonPropertyName("projectCode")] string ProjectCode,
    [property: JsonPropertyName("domainCode")] string DomainCode,
    [property: JsonPropertyName("projectName")] string? ProjectName,
    [property: JsonPropertyName("status")] ProjectStatus Status,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("updatedAt")] DateTime? UpdatedAt,
    [property: JsonPropertyName("domain")] DomainResponse Domain,
    [property: JsonPropertyName("teams")] IEnumerable<ProjectTeamResponse> Teams);

public record DomainResponse(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("isActive")] bool IsActive,
    [property: JsonPropertyName("isGlobal")] bool IsGlobal);

public record ProjectTeamResponse(
    [property: JsonPropertyName("teamCode")] string TeamCode,
    [property: JsonPropertyName("teamName")] string? TeamName,
    [property: JsonPropertyName("isActive")] bool IsActive);
```

### Generic Response Models

```csharp
public class PagedResponse<T>
{
    [JsonPropertyName("data")]
    public IEnumerable<T> Data { get; set; } = Enumerable.Empty<T>();

    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("currentPage")]
    public int CurrentPage { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);

    [JsonPropertyName("hasNextPage")]
    public bool HasNextPage => CurrentPage < TotalPages;

    [JsonPropertyName("hasPreviousPage")]
    public bool HasPreviousPage => CurrentPage > 1;
}

public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("data")]
    public T? Data { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("errors")]
    public IEnumerable<string>? Errors { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public static ApiResponse<T> SuccessResult(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> ErrorResult(string message, IEnumerable<string>? errors = null)
        => new() { Success = false, Message = message, Errors = errors };
}
```

## Mapping Patterns

### AutoMapper Configuration

```csharp
public class ProjectMappingProfile : Profile
{
    public ProjectMappingProfile()
    {
        // Domain to Response mapping
        CreateMap<Project, ProjectResponse>()
            .ForMember(dest => dest.TeamCount, opt => opt.MapFrom(src => src.Teams.Count))
            .ForMember(dest => dest.CanBeActivated, opt => opt.MapFrom(src => src.CanBeActivated()));

        CreateMap<Project, ProjectDetailResponse>()
            .ForMember(dest => dest.Teams, opt => opt.MapFrom(src => src.Teams));

        // Request to Domain mapping
        CreateMap<CreateProjectRequest, Project>()
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => ProjectStatus.Draft));

        // Update mapping
        CreateMap<UpdateProjectRequest, Project>()
            .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

        // Search criteria mapping
        CreateMap<ProjectSearchRequest, ProjectSearchCriteria>();

        // Domain mappings
        CreateMap<Domain, DomainResponse>();
        CreateMap<ProjectTeam, ProjectTeamResponse>();
    }
}

// Usage in service
public class ProjectsService : IProjectsService
{
    private readonly IMapper _mapper;

    public async Task<Result<ProjectResponse>> CreateProjectAsync(CreateProjectRequest request)
    {
        var project = _mapper.Map<Project>(request);
        // ... business logic
        var response = _mapper.Map<ProjectResponse>(createdProject);
        return Result<ProjectResponse>.Success(response);
    }
}
```

### Manual Mapping Extensions

```csharp
public static class ProjectMappingExtensions
{
    public static ProjectResponse ToResponse(this Project project)
    {
        return new ProjectResponse(
            project.ProjectCode,
            project.DomainCode,
            project.ProjectName,
            project.Status,
            project.CreatedAt,
            project.UpdatedAt,
            project.Teams.Count,
            project.CanBeActivated());
    }

    public static Project ToEntity(this CreateProjectRequest request)


---

**💡 Pro Tip**: Keep DTOs simple and focused, use proper validation, and maintain clear separation between domain models and API contracts.
