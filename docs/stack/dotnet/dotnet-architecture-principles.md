# .NET Architecture Principles

**Quick Navigation:**
- **Implementation Patterns**: See `dotnet-patterns.md` for code examples
- **Dependency Injection**: See `dotnet-dependency-injection.md` for DI setup
- **Repository Layer**: See `dotnet-repository-patterns.md` for data access
- **Service Layer**: See `dotnet-service-layer.md` for business logic
- **API Layer**: See `dotnet-controller-patterns.md` for controllers
- **Data Models**: See `dotnet-data-models.md` for DTOs and domain models

This document outlines the core architectural principles and project organization patterns for .NET APIs in the Briggs System.

## Table of Contents

1. [Clean Architecture Pattern](#clean-architecture-pattern)
2. [Project Structure](#project-structure)
3. [SOLID Principles](#solid-principles)
4. [Layered Architecture](#layered-architecture)
5. [Design Patterns](#design-patterns)
6. [Architecture Guidelines](#architecture-guidelines)

## Clean Architecture Pattern

Follow a clean, layered architecture with clear separation of concerns:

```
project-root/
├── Controllers/          # API endpoints and request handling
├── Services/            # Business logic and orchestration
│   ├── Interfaces/      # Service contracts
├── Repository/          # Data access layer
│   ├── Interfaces/      # Repository contracts
│   ├── Models/          # Domain models
├── Models/              # Request/Response DTOs
│   ├── Requests/        # Request-specific models
│   ├── Responses/       # Response-specific models
├── Enums/               # Enumeration definitions
├── Exceptions/          # Custom exception classes
├── Middleware/          # Custom middleware components
├── Extensions/          # Extension methods and utilities
├── Validators/          # Input validation logic
├── Configuration/       # Configuration models and setup
└── Properties/          # Application configuration files
```

### Architecture Layers

```
┌─────────────────────────────────────┐
│           Presentation Layer        │  ← Controllers, Middleware
│            (Controllers/)           │
├─────────────────────────────────────┤
│          Application Layer          │  ← Services, Business Logic
│            (Services/)              │
├─────────────────────────────────────┤
│           Domain Layer              │  ← Models, Business Entities
│     (Repository/Models/)            │
├─────────────────────────────────────┤
│         Infrastructure Layer        │  ← Data Access, External APIs
│          (Repository/)              │
└─────────────────────────────────────┘
```

## Project Structure

### Standard Folder Organization

```
src/
├── Controllers/             # REST API endpoints
│   ├── v1/                 # API versioning
│   └── v2/
├── Services/               # Business logic layer
│   ├── Interfaces/         # Service contracts
│   └── Implementations/    # Service implementations
├── Repository/             # Data access layer
│   ├── Interfaces/         # Repository contracts
│   ├── Models/            # Domain entities
│   └── Implementations/    # Repository implementations
├── Models/                 # Data transfer objects
│   ├── Requests/          # API request models
│   ├── Responses/         # API response models
│   └── Common/            # Shared models
├── Enums/                 # System enumerations
├── Exceptions/            # Custom exception types
├── Middleware/            # Custom middleware
├── Extensions/            # Extension methods
├── Validators/            # Input validation
├── Configuration/         # App configuration
└── Properties/            # Assembly properties
```

### File Naming Conventions

- **Controllers**: `{Entity}Controller.cs` (e.g., `ProjectsController.cs`)
- **Services**: `{Entity}Service.cs` with `I{Entity}Service.cs` interface
- **Repositories**: `{Entity}Repo.cs` with `I{Entity}Repo.cs` interface
- **Models**: `{Entity}Request.cs`, `{Entity}Response.cs`, `{Entity}.cs`
- **Validators**: `{Model}Validator.cs`
- **Extensions**: `{Type}Extensions.cs`

## SOLID Principles

### Single Responsibility Principle (SRP)
Each class should have only one reason to change.

```csharp
// Good: Single responsibility
public class ProjectService
{
    // Only handles project business logic
}

public class ProjectValidator
{
    // Only handles project validation
}

// Avoid: Multiple responsibilities
public class ProjectManager  // BAD
{
    // Handles business logic, validation, data access, etc.
}
```

### Open/Closed Principle (OCP)
Classes should be open for extension, closed for modification.

```csharp
public interface INotificationService
{
    Task SendAsync(NotificationRequest request);
}

// Extend functionality without modifying existing code
public class EmailNotificationService : INotificationService { }
public class SmsNotificationService : INotificationService { }
```

### Liskov Substitution Principle (LSP)
Subtypes must be substitutable for their base types.

```csharp
public abstract class Repository<T>
{
    public abstract Task<T> GetByIdAsync(int id);
}

// All implementations must honor the contract
public class ProjectsRepo : Repository<Project> { }
public class DomainsRepo : Repository<Domain> { }
```

### Interface Segregation Principle (ISP)
Depend on abstractions, not concretions.

```csharp
// Good: Focused interfaces
public interface IProjectReader
{
    Task<Project> GetAsync(string code);
}

public interface IProjectWriter
{
    Task<bool> CreateAsync(Project project);
}

// Avoid: Fat interfaces
public interface IProjectRepository  // BAD
{
    // Too many unrelated methods
}
```

### Dependency Inversion Principle (DIP)
High-level modules should not depend on low-level modules.

```csharp
public class ProjectService
{
    private readonly IProjectsRepo _repository;  // Abstraction
    
    public ProjectService(IProjectsRepo repository)
    {
        _repository = repository;  // Injected dependency
    }
}
```

## Layered Architecture

### Layer Responsibilities

#### Presentation Layer (Controllers)
- Handle HTTP requests/responses
- Input validation (basic)
- Route to appropriate services
- Return appropriate status codes

#### Application Layer (Services)
- Orchestrate business workflows
- Implement business rules
- Coordinate between repositories
- Handle cross-cutting concerns

#### Domain Layer (Models)
- Define business entities
- Implement domain logic
- Enforce business invariants
- Value objects and aggregates

#### Infrastructure Layer (Repository)
- Data access implementation
- External service integration
- Technical concerns (caching, logging)
- Database-specific logic

### Layer Dependencies

```
Controllers → Services → Repository
     ↓           ↓          ↓
   Models ←   Models  ←   Models
```

**Rules:**
- Higher layers can depend on lower layers
- Lower layers cannot depend on higher layers
- Dependencies should flow inward
- Use interfaces to invert dependencies

## Design Patterns

### Repository Pattern
Encapsulate data access logic and provide a uniform interface.

### Service Layer Pattern
Coordinate application workflows and implement business logic.

### Factory Pattern
Create objects without specifying exact classes.

### Strategy Pattern
Define a family of algorithms and make them interchangeable.

### Decorator Pattern
Add behavior to objects dynamically.

## Architecture Guidelines

### Key Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Inversion**: Depend on abstractions, not concretions
3. **Interface Segregation**: Small, focused interfaces
4. **Single Responsibility**: Each class has one reason to change
5. **Don't Repeat Yourself (DRY)**: Avoid code duplication
6. **Keep It Simple (KISS)**: Prefer simple solutions
7. **You Aren't Gonna Need It (YAGNI)**: Don't over-engineer

### Best Practices

1. **Use Interfaces**: Define contracts for all service boundaries
2. **Async/Await**: All I/O operations should be asynchronous
3. **Cancellation Tokens**: Support cancellation for long-running operations
4. **Result Objects**: Consider using Result<T> pattern for error handling
5. **Immutable Objects**: Prefer immutable data structures where possible
6. **Configuration**: Use strongly-typed configuration objects
7. **Logging**: Implement structured logging throughout the application

### Anti-Patterns to Avoid

1. **Anemic Domain Models**: Models with no behavior
2. **God Objects**: Classes that do too much
3. **Circular Dependencies**: Services depending on each other
4. **Leaky Abstractions**: Implementation details bleeding through interfaces
5. **Feature Envy**: Classes accessing too much data from other classes
6. **Primitive Obsession**: Overusing primitive types instead of value objects

---

**Next Steps:**
- Review `dotnet-dependency-injection.md` for DI setup patterns
- See `dotnet-repository-patterns.md` for data access implementation
- Check `dotnet-service-layer.md` for business logic organization
- Explore `dotnet-controller-patterns.md` for API design
