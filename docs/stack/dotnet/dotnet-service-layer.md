# .NET Service Layer Patterns

**Quick Navigation:**
- **Architecture Principles**: See `dotnet-architecture-principles.md` for layered architecture
- **Repository Layer**: See `dotnet-repository-patterns.md` for data access patterns
- **Controller Layer**: See `dotnet-controller-patterns.md` for API endpoints
- **Data Models**: See `dotnet-data-models.md` for DTOs and validation

This document covers service layer design, business logic implementation, and orchestration patterns for .NET applications in the Briggs System.

## Table of Contents

1. [Service Layer Design](#service-layer-design)
2. [Business Logic Orchestration](#business-logic-orchestration)
3. [Service Interface Patterns](#service-interface-patterns)
4. [Error Handling](#error-handling)
5. [Validation Integration](#validation-integration)
6. [Cross-Cutting Concerns](#cross-cutting-concerns)

## Service Layer Design

### Service Layer Responsibilities

The service layer acts as the orchestration layer between controllers and repositories:

- **Business Logic**: Implement domain rules and workflows
- **Orchestration**: Coordinate multiple repository calls
- **Validation**: Validate business rules and input
- **Error Handling**: Provide consistent error responses
- **Logging**: Log business operations and errors
- **Mapping**: Convert between DTOs and domain models

### Basic Service Interface

```csharp
public interface IProjectsService
{
    Task<Result<Project?>> GetProjectByCodeAsync(string code, string domain, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Project>>> GetProjectsByDomainAsync(string domain, CancellationToken cancellationToken = default);
    Task<Result<Project>> CreateProjectAsync(CreateProjectRequest request, CancellationToken cancellationToken = default);
    Task<Result<Project>> UpdateProjectAsync(string code, string domain, UpdateProjectRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteProjectAsync(string code, string domain, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Project>>> SearchProjectsAsync(ProjectSearchCriteria criteria, CancellationToken cancellationToken = default);
}
```

### Service Implementation Pattern

```csharp
public class ProjectsService : IProjectsService
{
    private readonly IProjectsRepo _projectsRepo;
    private readonly IDomainsRepo _domainsRepo;
    private readonly IValidator<CreateProjectRequest> _createValidator;
    private readonly IValidator<UpdateProjectRequest> _updateValidator;
    private readonly IMapper _mapper;
    private readonly ILogger<ProjectsService> _logger;

    public ProjectsService(
        IProjectsRepo projectsRepo,
        IDomainsRepo domainsRepo,
        IValidator<CreateProjectRequest> createValidator,
        IValidator<UpdateProjectRequest> updateValidator,
        IMapper mapper,
        ILogger<ProjectsService> logger)
    {
        _projectsRepo = projectsRepo;
        _domainsRepo = domainsRepo;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<Result<Project?>> GetProjectByCodeAsync(
        string code, 
        string domain, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Retrieving project {ProjectCode} in domain {DomainCode}", code, domain);
        
        var result = await _projectsRepo.GetProjectByCodeAsync(code, domain, cancellationToken);
        
        if (!result.IsSuccess)
        {
            _logger.LogWarning("Failed to retrieve project {ProjectCode}: {Error}", code, result.Error);
        }
        
        return result;
    }

    public async Task<Result<Project>> CreateProjectAsync(
        CreateProjectRequest request, 
        CancellationToken cancellationToken = default)
    {
        // Validation
        var validationResult = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = string.Join(", ", validationResult.Errors.Select(e => e.ErrorMessage));
            return Result<Project>.Failure($"Validation failed: {errors}");
        }

        // Business logic - check domain exists
        var domainResult = await _domainsRepo.GetDomainByCodeAsync(request.DomainCode, cancellationToken);
        if (!domainResult.IsSuccess || domainResult.Value == null)
        {
            return Result<Project>.Failure($"Domain {request.DomainCode} does not exist");
        }

        // Business logic - check if project already exists
        var existingResult = await _projectsRepo.GetProjectByCodeAsync(request.ProjectCode, request.DomainCode, cancellationToken);
        if (existingResult.IsSuccess && existingResult.Value != null)
        {
            return Result<Project>.Failure($"Project {request.ProjectCode} already exists in domain {request.DomainCode}");
        }

        // Map and create
        var project = _mapper.Map<Project>(request);
        project.CreatedAt = DateTime.UtcNow;
        
        var createResult = await _projectsRepo.CreateProjectAsync(project, cancellationToken);
        
        if (createResult.IsSuccess)
        {
            _logger.LogInformation("Created project {ProjectCode} in domain {DomainCode}", 
                request.ProjectCode, request.DomainCode);
        }
        
        return createResult;
    }
}
```

## Business Logic Orchestration

### Complex Business Workflows

```csharp
public class ProjectActivationService : IProjectActivationService
{
    private readonly IProjectsRepo _projectsRepo;
    private readonly ITeamsRepo _teamsRepo;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ProjectActivationService> _logger;

    public async Task<Result<bool>> ActivateProjectAsync(
        string projectCode, 
        string domain, 
        ProjectActivationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting activation for project {ProjectCode} in domain {Domain}", 
            projectCode, domain);

        try
        {
            // Step 1: Validate project exists and can be activated
            var projectResult = await _projectsRepo.GetProjectByCodeAsync(projectCode, domain, cancellationToken);
            if (!projectResult.IsSuccess || projectResult.Value == null)
            {
                return Result<bool>.Failure($"Project {projectCode} not found");
            }

            var project = projectResult.Value;
            if (!project.CanBeActivated())
            {
                return Result<bool>.Failure($"Project {projectCode} cannot be activated in current state");
            }

            // Step 2: Validate teams are assigned
            var teamsResult = await _teamsRepo.GetTeamsByProjectAsync(projectCode, domain, cancellationToken);
            if (!teamsResult.IsSuccess || !teamsResult.Value.Any())
            {
                return Result<bool>.Failure("Cannot activate project without assigned teams");
            }

            // Step 3: Activate project
            project.Activate(request.ActivatedBy, request.ActivationDate);
            var updateResult = await _projectsRepo.UpdateProjectAsync(project, cancellationToken);
            
            if (!updateResult.IsSuccess)
            {
                return Result<bool>.Failure($"Failed to activate project: {updateResult.Error}");
            }

            // Step 4: Send notifications
            await _notificationService.NotifyProjectActivatedAsync(project, teamsResult.Value, cancellationToken);

            _logger.LogInformation("Successfully activated project {ProjectCode}", projectCode);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating project {ProjectCode}", projectCode);
            return Result<bool>.Failure($"Activation failed: {ex.Message}");
        }
    }
}
```

### Transaction Coordination

```csharp
public class ProjectManagementService : IProjectManagementService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventPublisher _eventPublisher;
    private readonly ILogger<ProjectManagementService> _logger;

    public async Task<Result<Project>> CreateProjectWithTeamsAsync(
        CreateProjectWithTeamsRequest request,
        CancellationToken cancellationToken = default)
    {
        await _unitOfWork.BeginTransactionAsync();
        
        try
        {
            // Create project
            var project = new Project
            {
                ProjectCode = request.ProjectCode,
                DomainCode = request.DomainCode,
                ProjectName = request.ProjectName,
                CreatedAt = DateTime.UtcNow
            };

            var projectResult = await _unitOfWork.Projects.CreateProjectAsync(project, cancellationToken);
            if (!projectResult.IsSuccess)
            {
                await _unitOfWork.RollbackTransactionAsync();
                return Result<Project>.Failure($"Failed to create project: {projectResult.Error}");
            }

            // Create teams
            foreach (var teamRequest in request.Teams)
            {
                var team = new ProjectTeam
                {
                    ProjectCode = request.ProjectCode,
                    DomainCode = request.DomainCode,
                    TeamCode = teamRequest.TeamCode,
                    TeamName = teamRequest.TeamName
                };

                var teamResult = await _unitOfWork.Teams.CreateTeamAsync(team, cancellationToken);
                if (!teamResult.IsSuccess)
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    return Result<Project>.Failure($"Failed to create team: {teamResult.Error}");
                }
            }

            await _unitOfWork.CommitTransactionAsync();

            // Publish domain event
            await _eventPublisher.PublishAsync(new ProjectCreatedEvent(project), cancellationToken);

            _logger.LogInformation("Created project {ProjectCode} with {TeamCount} teams", 
                request.ProjectCode, request.Teams.Count);

            return Result<Project>.Success(project);
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync();
            _logger.LogError(ex, "Error creating project with teams");
            return Result<Project>.Failure($"Transaction failed: {ex.Message}");
        }
    }
}
```

## Service Interface Patterns

### Generic Service Interface

```csharp
public interface IService<TEntity, TKey> where TEntity : class
{
    Task<Result<TEntity?>> GetByIdAsync(TKey id, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<TEntity>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Result<TEntity>> CreateAsync(TEntity entity, CancellationToken cancellationToken = default);
    Task<Result<TEntity>> UpdateAsync(TKey id, TEntity entity, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteAsync(TKey id, CancellationToken cancellationToken = default);
}

public interface IProjectsService : IService<Project, ProjectKey>
{
    Task<Result<Project?>> GetProjectByCodeAsync(string code, string domain, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Project>>> GetProjectsByDomainAsync(string domain, CancellationToken cancellationToken = default);
}

public record ProjectKey(string Code, string Domain);
```

### Command/Query Separation

```csharp
// Command interfaces
public interface IProjectCommandService
{
    Task<Result<Project>> CreateProjectAsync(CreateProjectCommand command, CancellationToken cancellationToken = default);
    Task<Result<Project>> UpdateProjectAsync(UpdateProjectCommand command, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteProjectAsync(DeleteProjectCommand command, CancellationToken cancellationToken = default);
    Task<Result<bool>> ActivateProjectAsync(ActivateProjectCommand command, CancellationToken cancellationToken = default);
}

// Query interfaces  
public interface IProjectQueryService
{
    Task<Result<Project?>> GetProjectByCodeAsync(GetProjectByCodeQuery query, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Project>>> SearchProjectsAsync(SearchProjectsQuery query, CancellationToken cancellationToken = default);
    Task<Result<ProjectStatistics>> GetProjectStatisticsAsync(GetProjectStatisticsQuery query, CancellationToken cancellationToken = default);
}

// Command/Query objects
public record CreateProjectCommand(string ProjectCode, string DomainCode, string ProjectName, string CreatedBy);
public record GetProjectByCodeQuery(string ProjectCode, string DomainCode);
public record SearchProjectsQuery(string? Domain, string? SearchTerm, bool IncludeInactive, int Skip, int Take);
```

### Service Composition

```csharp
public interface IProjectOrchestrationService
{
    Task<Result<ProjectDashboard>> GetProjectDashboardAsync(string domain, CancellationToken cancellationToken = default);
    Task<Result<ProjectSummary>> GetProjectSummaryAsync(string projectCode, string domain, CancellationToken cancellationToken = default);
}

public class ProjectOrchestrationService : IProjectOrchestrationService
{
    private readonly IProjectQueryService _projectQuery;
    private readonly ITeamQueryService _teamQuery;
    private readonly ILocationQueryService _locationQuery;
    private readonly IStatisticsService _statisticsService;

    public async Task<Result<ProjectDashboard>> GetProjectDashboardAsync(
        string domain, 
        CancellationToken cancellationToken = default)
    {
        var projectsTask = _projectQuery.SearchProjectsAsync(
            new SearchProjectsQuery(domain, null, false, 0, 10), cancellationToken);
        var statsTask = _statisticsService.GetDomainStatisticsAsync(domain, cancellationToken);
        
        await Task.WhenAll(projectsTask, statsTask);
        
        var projects = await projectsTask;
        var stats = await statsTask;
        
        if (!projects.IsSuccess) return Result<ProjectDashboard>.Failure(projects.Error!);
        if (!stats.IsSuccess) return Result<ProjectDashboard>.Failure(stats.Error!);
        
        var dashboard = new ProjectDashboard
        {
            Domain = domain,
            RecentProjects = projects.Value!,
            Statistics = stats.Value!,
            GeneratedAt = DateTime.UtcNow
        };
        
        return Result<ProjectDashboard>.Success(dashboard);
    }
}
```

## Error Handling

### Consistent Error Response Pattern

```csharp
public class ServiceErrorHandler
{
    private readonly ILogger<ServiceErrorHandler> _logger;

    public ServiceErrorHandler(ILogger<ServiceErrorHandler> logger)
    {
        _logger = logger;
    }

    public Result<T> HandleError<T>(Exception ex, string operation, object? context = null)
    {
        var contextInfo = context != null ? JsonSerializer.Serialize(context) : "N/A";
        
        return ex switch
        {
            ValidationException validationEx => HandleValidationError<T>(validationEx, operation),
            BusinessRuleException businessEx => HandleBusinessRuleError<T>(businessEx, operation),
            NotFoundException notFoundEx => HandleNotFoundError<T>(notFoundEx, operation),
            SqlException sqlEx => HandleDatabaseError<T>(sqlEx, operation, contextInfo),
            _ => HandleUnexpectedError<T>(ex, operation, contextInfo)
        };
    }

    private Result<T> HandleValidationError<T>(ValidationException ex, string operation)
    {
        _logger.LogWarning("Validation error in {Operation}: {Errors}", 
            operation, string.Join(", ", ex.Errors));
        return Result<T>.Failure($"Validation failed: {string.Join(", ", ex.Errors)}");


---

**💡 Pro Tip**: Keep services focused on business logic, use dependency injection for testability, and implement proper error handling and logging.
