# .NET Entity Framework Patterns

**Quick Navigation:**
- **Architecture Hub**: See `dotnet-architecture.md` for complete documentation map
- **Repository Patterns**: See `dotnet-repository-patterns.md` for data access patterns

This document covers Entity Framework Core usage patterns for .NET applications in the Briggs System.

## Basic EF Configuration

### DbContext Setup
```csharp
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Project> Projects { get; set; }
    public DbSet<Domain> Domains { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure entities
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            
            // Foreign key relationship
            entity.HasOne(e => e.Domain)
                  .WithMany(d => d.Projects)
                  .HasForeignKey(e => e.DomainId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Domain>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Name).IsUnique();
        });
    }
}
```

### Service Registration
```csharp
// Program.cs
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
    options.EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
});
```

## Entity Configuration

### Basic Entity
```csharp
public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DomainId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Domain Domain { get; set; } = null!;
}

public class Domain
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
```

### Fluent Configuration
```csharp
public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("Projects");
        
        builder.HasKey(p => p.Id);
        
        builder.Property(p => p.Name)
               .IsRequired()
               .HasMaxLength(255);
               
        builder.Property(p => p.CreatedAt)
               .HasDefaultValueSql("GETUTCDATE()");
               
        builder.HasIndex(p => new { p.DomainId, p.Name })
               .IsUnique();
               
        builder.HasOne(p => p.Domain)
               .WithMany(d => d.Projects)
               .HasForeignKey(p => p.DomainId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
```

## Repository with EF

### EF Repository Implementation
```csharp
public class ProjectsEfRepository : IProjectsRepo
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ProjectsEfRepository> _logger;

    public ProjectsEfRepository(ApplicationDbContext context, ILogger<ProjectsEfRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<Project>> GetByDomainAsync(int domainId)
    {
        _logger.LogDebug("Getting projects for domain {DomainId}", domainId);
        
        return await _context.Projects
            .Where(p => p.DomainId == domainId && p.IsActive)
            .Include(p => p.Domain)
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    public async Task<Project?> GetByIdAsync(int id)
    {
        return await _context.Projects
            .Include(p => p.Domain)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);
    }

    public async Task<Project> CreateAsync(Project project)
    {
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created project {ProjectId} in domain {DomainId}", 
            project.Id, project.DomainId);
            
        return project;
    }

    public async Task<Project> UpdateAsync(Project project)
    {
        project.UpdatedAt = DateTime.UtcNow;
        _context.Entry(project).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        
        return project;
    }

    public async Task DeleteAsync(int id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project != null)
        {
            project.IsActive = false; // Soft delete
            project.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
```

## Migrations

### Creating Migrations
```bash
# Add new migration
dotnet ef migrations add InitialCreate

# Update database
dotnet ef database update

# Generate SQL script
dotnet ef migrations script
```

### Migration Example
```csharp
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Domains",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Domains", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Projects",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                DomainId = table.Column<int>(type: "int", nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Projects", x => x.Id);
                table.ForeignKey(
                    name: "FK_Projects_Domains_DomainId",
                    column: x => x.DomainId,
                    principalTable: "Domains",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Domains_Name",
            table: "Domains",
            column: "Name",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Projects_DomainId_Name",
            table: "Projects",
            columns: new[] { "DomainId", "Name" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Projects");
        migrationBuilder.DropTable(name: "Domains");
    }
}
```

## Query Patterns

### Complex Queries
```csharp
public async Task<IEnumerable<Project>> GetProjectsWithStatsAsync(int domainId)
{
    return await _context.Projects
        .Where(p => p.DomainId == domainId && p.IsActive)
        .Select(p => new Project
        {
            Id = p.Id,
            Name = p.Name,
            DomainId = p.DomainId,
            CreatedAt = p.CreatedAt,
            // Add computed properties if needed
        })
        .ToListAsync();
}
```

### Raw SQL Queries
```csharp
public async Task<IEnumerable<Project>> GetProjectsByCustomQueryAsync(int domainId)
{
    return await _context.Projects
        .FromSqlRaw("""
            SELECT p.* FROM Projects p 
            INNER JOIN Domains d ON p.DomainId = d.Id 
            WHERE p.DomainId = {0} AND p.IsActive = 1 AND d.IsActive = 1
            """, domainId)
        .ToListAsync();
}
```

## Performance Optimization

### Lazy vs Eager Loading
```csharp
// Eager loading - load related data upfront
var projectsWithDomain = await _context.Projects
    .Include(p => p.Domain)
    .Where(p => p.DomainId == domainId)
    .ToListAsync();

// Explicit loading - load related data when needed
var project = await _context.Projects.FindAsync(projectId);
await _context.Entry(project)
    .Reference(p => p.Domain)
    .LoadAsync();
```

### Query Splitting
```csharp
// For complex includes, use split queries
var projects = await _context.Projects
    .AsSplitQuery()
    .Include(p => p.Domain)
    .Where(p => p.DomainId == domainId)
    .ToListAsync();
```

### Compiled Queries
```csharp
private static readonly Func<ApplicationDbContext, int, IAsyncEnumerable<Project>> 
    GetProjectsByDomainQuery = EF.CompileAsyncQuery(
        (ApplicationDbContext context, int domainId) =>
            context.Projects.Where(p => p.DomainId == domainId && p.IsActive));

public async Task<IEnumerable<Project>> GetByDomainOptimizedAsync(int domainId)
{
    return await GetProjectsByDomainQuery(_context, domainId).ToListAsync();
}
```

## Testing with EF

### In-Memory Database for Testing
```csharp
public class ProjectsEfRepositoryTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly ProjectsEfRepository _repository;

    public ProjectsEfRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _repository = new ProjectsEfRepository(_context, Mock.Of<ILogger<ProjectsEfRepository>>());
        
        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        _context.Domains.Add(new Domain { Id = 1, Name = "Test Domain" });
        _context.Projects.Add(new Project { Id = 1, Name = "Test Project", DomainId = 1 });
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetByDomainAsync_ValidDomain_ReturnsProjects()
    {
        // Act
        var results = await _repository.GetByDomainAsync(1);

        // Assert
        results.Should().HaveCount(1);
        results.First().Name.Should().Be("Test Project");
    }

    public void Dispose() => _context.Dispose();
}
```

## Best Practices

### Connection Management
- Use dependency injection for DbContext
- Configure appropriate connection pool settings
- Use async methods for database operations
- Implement proper disposal patterns

### Performance Guidelines
- Use `AsNoTracking()` for read-only queries
- Implement pagination for large result sets
- Use compiled queries for frequently executed queries
- Monitor query execution plans

### Security Considerations
- Always use parameterized queries
- Implement proper authorization checks
- Use domain filtering for multi-tenant scenarios
- Validate input parameters

---

**💡 Pro Tip**: Use Entity Framework for complex object graphs and relationships, but consider Dapper for high-performance scenarios. Always use async methods and implement proper error handling.
