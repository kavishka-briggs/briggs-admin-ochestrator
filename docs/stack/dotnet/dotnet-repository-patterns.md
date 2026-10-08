# .NET Repository Patterns

**Quick Navigation:**
- **Architecture Principles**: See `dotnet-architecture-principles.md` for layered architecture
- **Dependency Injection**: See `dotnet-dependency-injection.md` for DI setup
- **Service Layer**: See `dotnet-service-layer.md` for business logic patterns
- **Data Models**: See `dotnet-data-models.md` for entity definitions

This document covers repository pattern implementation, data access patterns, and database integration for .NET applications in the Briggs System.

## Table of Contents

1. [Repository Interface Design](#repository-interface-design)
2. [Implementation Guidelines](#implementation-guidelines)
3. [Dapper Integration](#dapper-integration)
4. [Connection Management](#connection-management)
5. [Error Handling](#error-handling)
6. [Query Patterns](#query-patterns)
7. [Transaction Support](#transaction-support)

## Repository Interface Design

### Basic Repository Interface

Define clear, focused repository interfaces:

```csharp
public interface IProjectsRepo
{
    Task<Project?> GetProjectByCodeAsync(string code, string domain, CancellationToken cancellationToken = default);
    Task<List<Project>> GetAllProjectsAsync(CancellationToken cancellationToken = default);
    Task<List<Project>> GetProjectsByDomainAsync(string domain, CancellationToken cancellationToken = default);
    Task<List<Project>> GetProjectsBatchAsync(IEnumerable<ProjectQuery> queries, CancellationToken cancellationToken = default);
    Task<bool> UpdateProjectAsync(Project project, CancellationToken cancellationToken = default);
    Task<bool> CreateProjectAsync(Project project, CancellationToken cancellationToken = default);
    Task<bool> DeleteProjectAsync(string code, string domain, CancellationToken cancellationToken = default);
}
```

### Generic Repository Base

```csharp
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(object id, CancellationToken cancellationToken = default);
    Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<bool> CreateAsync(T entity, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(object id, CancellationToken cancellationToken = default);
}

public interface IProjectsRepo : IRepository<Project>
{
    // Specific project methods
    Task<Project?> GetProjectByCodeAsync(string code, string domain, CancellationToken cancellationToken = default);
    Task<List<Project>> GetProjectsByDomainAsync(string domain, CancellationToken cancellationToken = default);
}
```

### Result Pattern Interface

```csharp
public interface IProjectsRepo
{
    Task<Result<Project?>> GetProjectByCodeAsync(string code, string domain, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Project>>> GetAllProjectsAsync(CancellationToken cancellationToken = default);
    Task<Result<Project>> CreateProjectAsync(Project project, CancellationToken cancellationToken = default);
    Task<Result<bool>> UpdateProjectAsync(Project project, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteProjectAsync(string code, string domain, CancellationToken cancellationToken = default);
}

public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Value { get; private set; }
    public string? Error { get; private set; }

    private Result(bool isSuccess, T? value, string? error)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(string error) => new(false, default, error);
}
```

## Implementation Guidelines

### Core Implementation Principles

1. **Use Dapper for Data Access**: Lightweight ORM for better performance and control
2. **Parameterized Queries**: Always use parameters to prevent SQL injection
3. **Connection Management**: Use connection factory pattern, implement proper disposal
4. **Async/Await**: All database operations should be asynchronous
5. **Transaction Support**: Provide transaction overloads for complex operations
6. **Result Objects**: Consider using Result<T> pattern for better error handling
7. **Query Object Pattern**: For complex queries, use dedicated query objects

### Basic Repository Implementation

```csharp
public class ProjectsRepo : IProjectsRepo
{
    private readonly IDatabaseConnectionFactory _connectionFactory;
    private readonly ILogger<ProjectsRepo> _logger;

    public ProjectsRepo(IDatabaseConnectionFactory connectionFactory, ILogger<ProjectsRepo> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<Result<Project?>> GetProjectByCodeAsync(
        string code, 
        string domain, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            
            const string sql = @"
                SELECT DOMAIN_CODE as DomainCode, 
                       PROJECT_CODE as ProjectCode, 
                       DESCRIPTION as ProjectName 
                FROM project.PROJECT 
                WHERE PROJECT_CODE = @ProjectCode 
                AND DOMAIN_CODE = @DomainCode";

            var param = new { ProjectCode = code, DomainCode = domain };
            var project = await connection.QueryFirstOrDefaultAsync<Project>(
                new CommandDefinition(sql, param, cancellationToken: cancellationToken));
                
            return Result<Project?>.Success(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project {ProjectCode} in domain {DomainCode}", code, domain);
            return Result<Project?>.Failure($"Failed to retrieve project: {ex.Message}");
        }
    }

    public async Task<Result<IEnumerable<Project>>> GetProjectsBatchAsync(
        IEnumerable<ProjectQuery> queries, 
        CancellationToken cancellationToken = default)
    {
        using var connection = _connectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();
        
        try
        {
            var results = new List<Project>();
            
            foreach (var query in queries)
            {
                var result = await ProcessProjectQuery(connection, query, transaction, cancellationToken);
                if (result != null) results.Add(result);
            }
            
            transaction.Commit();
            return Result<IEnumerable<Project>>.Success(results);
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "Error processing batch project queries");
            return Result<IEnumerable<Project>>.Failure($"Batch operation failed: {ex.Message}");
        }
    }
}
```

## Dapper Integration

### Connection Factory Pattern

```csharp
public interface IDatabaseConnectionFactory
{
    IDbConnection CreateConnection();
    IDbConnection CreateConnection(string connectionString);
}

public class DatabaseConnectionFactory : IDatabaseConnectionFactory
{
    private readonly string _connectionString;
    
    public DatabaseConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new ArgumentException("DefaultConnection not found");
    }
    
    public IDbConnection CreateConnection()
    {
        return new SqlConnection(_connectionString);
    }
    
    public IDbConnection CreateConnection(string connectionString)
    {
        return new SqlConnection(connectionString);
    }
}
```

### Query Execution Patterns

```csharp
public class ProjectsRepo : IProjectsRepo
{
    private readonly IDatabaseConnectionFactory _connectionFactory;
    
    // Single result query
    public async Task<Project?> GetProjectByCodeAsync(string code, string domain)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string sql = @"
            SELECT * FROM project.PROJECT 
            WHERE PROJECT_CODE = @Code AND DOMAIN_CODE = @Domain";
        
        return await connection.QueryFirstOrDefaultAsync<Project>(
            sql, new { Code = code, Domain = domain });
    }
    
    // Multiple results query
    public async Task<IEnumerable<Project>> GetProjectsByDomainAsync(string domain)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string sql = @"
            SELECT * FROM project.PROJECT 
            WHERE DOMAIN_CODE = @Domain 
            ORDER BY PROJECT_CODE";
        
        return await connection.QueryAsync<Project>(sql, new { Domain = domain });
    }
    
    // Command execution
    public async Task<bool> CreateProjectAsync(Project project)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string sql = @"
            INSERT INTO project.PROJECT (PROJECT_CODE, DOMAIN_CODE, DESCRIPTION)
            VALUES (@ProjectCode, @DomainCode, @ProjectName)";
        
        var rowsAffected = await connection.ExecuteAsync(sql, project);
        return rowsAffected > 0;
    }
}
```

### Complex Queries with Multiple Result Sets

```csharp
public async Task<ProjectWithDetails> GetProjectWithDetailsAsync(string code, string domain)
{
    using var connection = _connectionFactory.CreateConnection();
    
    const string sql = @"
        SELECT * FROM project.PROJECT 
        WHERE PROJECT_CODE = @Code AND DOMAIN_CODE = @Domain;
        
        SELECT * FROM project.PROJECT_LOCATIONS 
        WHERE PROJECT_CODE = @Code AND DOMAIN_CODE = @Domain;
        
        SELECT * FROM project.PROJECT_TEAMS 
        WHERE PROJECT_CODE = @Code AND DOMAIN_CODE = @Domain;";
    
    using var multi = await connection.QueryMultipleAsync(sql, new { Code = code, Domain = domain });
    
    var project = await multi.ReadFirstOrDefaultAsync<Project>();
    var locations = await multi.ReadAsync<ProjectLocation>();
    var teams = await multi.ReadAsync<ProjectTeam>();
    
    return new ProjectWithDetails(project, locations, teams);
}
```

## Connection Management

### Using Statement Pattern

```csharp
public async Task<Project?> GetProjectAsync(string code)
{
    using var connection = _connectionFactory.CreateConnection();
    // Connection automatically disposed
    return await connection.QueryFirstOrDefaultAsync<Project>(sql, parameters);
}
```

### Connection Factory with Options

```csharp
public class DatabaseConnectionFactory : IDatabaseConnectionFactory
{
    private readonly DatabaseOptions _options;
    
    public DatabaseConnectionFactory(IOptions<DatabaseOptions> options)
    {
        _options = options.Value;
    }
    
    public IDbConnection CreateConnection()
    {
        var connection = new SqlConnection(_options.ConnectionString);
        
        if (_options.EnableRetryOnFailure)
        {
            // Configure retry policy
        }
        
        return connection;
    }
}

public class DatabaseOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public int CommandTimeout { get; set; } = 30;
    public bool EnableRetryOnFailure { get; set; } = true;
    public int MaxRetryCount { get; set; } = 3;
}
```

## Error Handling

### Repository-Level Error Handling

```csharp
public async Task<Result<Project>> CreateProjectAsync(Project project)
{
    try
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string sql = @"
            INSERT INTO project.PROJECT (PROJECT_CODE, DOMAIN_CODE, DESCRIPTION)
            OUTPUT INSERTED.*
            VALUES (@ProjectCode, @DomainCode, @ProjectName)";
        
        var createdProject = await connection.QueryFirstAsync<Project>(sql, project);
        
        _logger.LogInformation("Created project {ProjectCode} in domain {DomainCode}", 
            project.ProjectCode, project.DomainCode);
            
        return Result<Project>.Success(createdProject);
    }
    catch (SqlException ex) when (ex.Number == 2627) // Primary key violation
    {
        _logger.LogWarning("Project {ProjectCode} already exists in domain {DomainCode}", 
            project.ProjectCode, project.DomainCode);
        return Result<Project>.Failure("Project already exists");
    }
    catch (SqlException ex)
    {
        _logger.LogError(ex, "Database error creating project {ProjectCode}", project.ProjectCode);
        return Result<Project>.Failure($"Database error: {ex.Message}");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error creating project {ProjectCode}", project.ProjectCode);
        return Result<Project>.Failure($"Unexpected error: {ex.Message}");
    }
}
```

### Retry Pattern

```csharp
public class RetryRepository<T> : IRepository<T> where T : class
{
    private readonly IRepository<T> _inner;
    private readonly ILogger<RetryRepository<T>> _logger;
    private readonly int _maxRetries = 3;
    
    public RetryRepository(IRepository<T> inner, ILogger<RetryRepository<T>> logger)
    {
        _inner = inner;
        _logger = logger;
    }
    
    public async Task<Result<T?>> GetByIdAsync(object id, CancellationToken cancellationToken = default)
    {
        for (int attempt = 1; attempt <= _maxRetries; attempt++)
        {
            try
            {
                return await _inner.GetByIdAsync(id, cancellationToken);
            }
            catch (Exception ex) when (IsTransientError(ex) && attempt < _maxRetries)
            {
                _logger.LogWarning("Attempt {Attempt} failed for GetByIdAsync: {Error}", attempt, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), cancellationToken);
            }


---

**💡 Pro Tip**: Use repository pattern for testability, prefer Dapper for performance, implement proper error handling, and maintain domain isolation.
