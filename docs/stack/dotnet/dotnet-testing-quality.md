# .NET Testing and Quality Patterns

**Quick Navigation:**
- **Architecture Hub**: See `dotnet-architecture.md` for complete documentation map
- **Basic Patterns**: See `dotnet-patterns.md` for reusable code examples

This document covers essential testing strategies and quality practices for .NET applications in the Briggs System.

## Testing Framework Setup

### Required Packages
```xml
<PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
<PackageReference Include="xunit" Version="2.6.2" />
<PackageReference Include="xunit.runner.visualstudio" Version="2.5.3" />
<PackageReference Include="Moq" Version="4.20.69" />
<PackageReference Include="FluentAssertions" Version="6.12.0" />
```

## Unit Testing Patterns

### Service Testing
```csharp
[Collection("ProjectsService Tests")]
public class ProjectsServiceTests
{
    private readonly Mock<IProjectsRepo> _mockRepo;
    private readonly ProjectsService _service;

    public ProjectsServiceTests()
    {
        _mockRepo = new Mock<IProjectsRepo>();
        _service = new ProjectsService(_mockRepo.Object);
    }

    [Fact]
    public async Task GetProjectAsync_ValidId_ReturnsProject()
    {
        // Arrange
        var projectId = 1;
        var expectedProject = new Project { Id = projectId, Name = "Test Project" };
        _mockRepo.Setup(r => r.GetByIdAsync(projectId)).ReturnsAsync(expectedProject);

        // Act
        var result = await _service.GetProjectAsync(projectId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(projectId);
        _mockRepo.Verify(r => r.GetByIdAsync(projectId), Times.Once);
    }
}
```

### Repository Testing
```csharp
public class ProjectsRepoTests : IDisposable
{
    private readonly DbContext _context;
    private readonly ProjectsRepo _repository;

    public ProjectsRepoTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);
        _repository = new ProjectsRepo(_context);
    }

    [Fact]
    public async Task GetByDomainAsync_ValidDomain_ReturnsProjects()
    {
        // Arrange
        var domainId = 1;
        _context.Projects.Add(new Project { DomainId = domainId, Name = "Test" });
        await _context.SaveChangesAsync();

        // Act
        var results = await _repository.GetByDomainAsync(domainId);

        // Assert
        results.Should().HaveCount(1);
        results.First().DomainId.Should().Be(domainId);
    }

    public void Dispose() => _context.Dispose();
}
```

## Integration Testing

### API Testing Setup
```csharp
public class ProjectsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public ProjectsControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetProjects_ValidDomain_ReturnsOk()
    {
        // Arrange
        var domainId = 1;
        
        // Act
        var response = await _client.GetAsync($"/api/projects?domainId={domainId}");
        
        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

### Database Testing
```csharp
public class DatabaseIntegrationTests : IDisposable
{
    private readonly string _connectionString;
    private readonly IDbConnectionFactory _connectionFactory;

    public DatabaseIntegrationTests()
    {
        _connectionString = "Server=localhost;Database=TestDb;Trusted_Connection=true;";
        _connectionFactory = new DatabaseConnectionFactory(_connectionString);
    }

    [Fact]
    public async Task GetProjectsByDomain_ValidDomain_ReturnsResults()
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var repository = new ProjectsRepo(connection);
        
        var results = await repository.GetByDomainAsync(1);
        
        results.Should().NotBeNull();
    }
}
```

## Controller Testing Patterns

### Authorization Testing
```csharp
[Fact]
public async Task GetProjects_UnauthorizedUser_ReturnsForbidden()
{
    // Arrange - no authentication headers
    
    // Act
    var response = await _client.GetAsync("/api/projects");
    
    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
}

[Fact]
public async Task GetProjects_WrongDomain_ReturnsForbidden()
{
    // Arrange
    _client.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", "valid-but-wrong-domain-token");
    
    // Act
    var response = await _client.GetAsync("/api/projects?domainId=999");
    
    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
}
```

### Validation Testing
```csharp
[Theory]
[InlineData(null)]
[InlineData("")]
[InlineData("   ")]
public async Task CreateProject_InvalidName_ReturnsBadRequest(string invalidName)
{
    // Arrange
    var request = new CreateProjectRequest { Name = invalidName };
    
    // Act
    var response = await _client.PostAsJsonAsync("/api/projects", request);
    
    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
}
```

## Test Data Management

### Test Fixtures
```csharp
public class TestDataFixture
{
    public Project CreateTestProject(int domainId = 1) => new()
    {
        Id = Random.Shared.Next(1, 1000),
        Name = $"Test Project {Guid.NewGuid()}",
        DomainId = domainId,
        CreatedAt = DateTime.UtcNow
    };

    public Domain CreateTestDomain(int id = 1) => new()
    {
        Id = id,
        Name = $"Test Domain {id}",
        IsActive = true
    };
}
```

### Mock Data Builders
```csharp
public class ProjectBuilder
{
    private Project _project = new();

    public ProjectBuilder WithId(int id)
    {
        _project.Id = id;
        return this;
    }

    public ProjectBuilder WithName(string name)
    {
        _project.Name = name;
        return this;
    }

    public ProjectBuilder InDomain(int domainId)
    {
        _project.DomainId = domainId;
        return this;
    }

    public Project Build() => _project;
}
```

## Test Organization

### Test Structure
```
Tests/
├── Unit/
│   ├── Services/        # Business logic tests
│   ├── Repositories/    # Data access tests
│   └── Validators/      # Validation tests
├── Integration/
│   ├── Controllers/     # API endpoint tests
│   ├── Database/        # Database integration tests
│   └── External/        # External service tests
└── Fixtures/
    ├── TestData.cs      # Test data factories
    └── Builders/        # Test object builders
```

## Quality Gates

### Code Coverage Requirements
- **Unit Tests**: Minimum 80% coverage for services and repositories
- **Integration Tests**: All API endpoints must have happy path tests
- **Critical Paths**: 95% coverage for authentication and authorization logic

### Test Naming Conventions
```csharp
// Pattern: [Method]_[Scenario]_[ExpectedResult]
public async Task GetProjectAsync_ValidId_ReturnsProject()
public async Task GetProjectAsync_InvalidId_ThrowsNotFoundException()
public async Task CreateProjectAsync_DuplicateName_ThrowsValidationException()
```

## Continuous Integration

### Test Pipeline
```yaml
- name: Run Unit Tests
  run: dotnet test --filter Category=Unit --collect:"XPlat Code Coverage"

- name: Run Integration Tests  
  run: dotnet test --filter Category=Integration

- name: Generate Coverage Report
  run: |
    dotnet tool install -g dotnet-reportgenerator-globaltool
    reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coverage
```

## Performance Testing

### Basic Load Testing
```csharp
[Fact]
public async Task GetProjects_HighLoad_MaintainsPerformance()
{
    var tasks = Enumerable.Range(0, 100)
        .Select(_ => _client.GetAsync("/api/projects?domainId=1"));
    
    var sw = Stopwatch.StartNew();
    var responses = await Task.WhenAll(tasks);
    sw.Stop();
    
    responses.Should().OnlyContain(r => r.IsSuccessStatusCode);
    sw.ElapsedMilliseconds.Should().BeLessThan(5000); // 5 second timeout
}
```

---

**💡 Pro Tip**: Focus on testing business logic and integration points. Use the builder pattern for complex test data setup and maintain clear separation between unit and integration tests.
