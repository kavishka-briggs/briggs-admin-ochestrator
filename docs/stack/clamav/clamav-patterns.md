# ClamAV Development Patterns

**Quick Navigation:**
- **Basic Setup**: See `clamav-quick-reference.md`
- **Architecture**: See `clamav-architecture.md`
- **Issues**: See `clamav-troubleshooting.md`

This document provides reusable code patterns and examples for working with the ClamAV antivirus service. Use these patterns to maintain consistency and follow best practices.

## Controller Patterns

### Basic Scan Controller Pattern
```csharp
[ApiController]
public class ClamAVController : ControllerBase
{
    private readonly ILogger<ClamAVController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IClamAVService _clamAVService;

    public ClamAVController(
        ILogger<ClamAVController> logger, 
        IConfiguration configuration,
        IClamAVService clamAVService)
    {
        _logger = logger;
        _configuration = configuration;
        _clamAVService = clamAVService;
    }

    [HttpPost("scan")]
    public async Task<IActionResult> ScanFile([FromQuery] string fileName)
    {
        try
        {
            var result = await _clamAVService.ScanFileAsync(fileName);
            return Ok(result);
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogWarning("File not found: {FileName}", fileName);
            return NotFound(new { Message = "File not found", FileName = fileName });
        }
        catch (ClamAVException ex)
        {
            _logger.LogError(ex, "ClamAV scanning error for file: {FileName}", fileName);
            return StatusCode(500, new { Message = "Scanning service error", Details = ex.Message });
        }
    }
}
```

### Enhanced Controller with Validation
```csharp
[ApiController]
[Route("api/[controller]")]
public class ClamAVController : ControllerBase
{
    private readonly IClamAVService _clamAVService;
    private readonly ILogger<ClamAVController> _logger;

    public ClamAVController(IClamAVService clamAVService, ILogger<ClamAVController> logger)
    {
        _clamAVService = clamAVService;
        _logger = logger;
    }

    [HttpPost("scan")]
    public async Task<ActionResult<ScanResult>> ScanFile([FromQuery] ScanRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _clamAVService.ScanFileAsync(request.FileName);
        
        _logger.LogInformation("File scan completed: {FileName}, Status: {Status}", 
            request.FileName, result.Status);

        return Ok(result);
    }

    [HttpGet("health")]
    public async Task<IActionResult> HealthCheck()
    {
        var isHealthy = await _clamAVService.IsHealthyAsync();
        return isHealthy ? Ok(new { Status = "Healthy" }) : StatusCode(503, new { Status = "Unhealthy" });
    }
}
```

## Service Layer Patterns

### ClamAV Service Interface
```csharp
public interface IClamAVService
{
    Task<ScanResult> ScanFileAsync(string fileName);
    Task<bool> IsHealthyAsync();
    Task<ServiceStatus> GetServiceStatusAsync();
    Task UpdateVirusDatabaseAsync();
}

public class ScanResult
{
    public ScanStatus Status { get; set; }
    public string Message { get; set; }
    public string? ThreatName { get; set; }
    public string RawOutput { get; set; }
    public DateTime ScanTime { get; set; }
    public TimeSpan Duration { get; set; }
}

public enum ScanStatus
{
    Clean,
    Infected,
    Error,
    FileNotFound,
    AccessDenied
}
```

### ClamAV Service Implementation
```csharp
public class ClamAVService : IClamAVService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClamAVService> _logger;
    private readonly string _fileMountPath;

    public ClamAVService(IConfiguration configuration, ILogger<ClamAVService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _fileMountPath = _configuration.GetValue("FILE_SHARE_MOUNT_PATH", "/files");
    }

    public async Task<ScanResult> ScanFileAsync(string fileName)
    {
        var startTime = DateTime.UtcNow;
        var filePath = Path.Combine(_fileMountPath, fileName);

        // Validate file exists and is accessible
        if (!File.Exists(filePath))
        {
            return new ScanResult
            {
                Status = ScanStatus.FileNotFound,
                Message = "File not found",
                ScanTime = startTime,
                Duration = DateTime.UtcNow - startTime
            };
        }

        try
        {
            var result = await ExecuteClamScanAsync(filePath);
            result.ScanTime = startTime;
            result.Duration = DateTime.UtcNow - startTime;
            
            _logger.LogInformation("Scan completed for {FileName}: {Status} in {Duration}ms", 
                fileName, result.Status, result.Duration.TotalMilliseconds);
                
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scanning file {FileName}", fileName);
            return new ScanResult
            {
                Status = ScanStatus.Error,
                Message = "Internal scanning error",
                RawOutput = ex.Message,
                ScanTime = startTime,
                Duration = DateTime.UtcNow - startTime
            };
        }
    }

    private async Task<ScanResult> ExecuteClamScanAsync(string filePath)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "clamdscan",
            Arguments = $"--no-summary --stdout \"{filePath}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = startInfo };
        process.Start();

        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        
        await process.WaitForExitAsync();

        return InterpretScanResult(process.ExitCode, output, error);
    }

    private ScanResult InterpretScanResult(int exitCode, string output, string error)
    {
        return exitCode switch
        {
            0 => new ScanResult
            {
                Status = ScanStatus.Clean,
                Message = "File is clean",
                RawOutput = output
            },
            1 => new ScanResult
            {
                Status = ScanStatus.Infected,
                Message = "File is infected",
                ThreatName = ExtractThreatName(output),
                RawOutput = output
            },
            _ => new ScanResult
            {
                Status = ScanStatus.Error,
                Message = "Scan error occurred",
                RawOutput = string.IsNullOrEmpty(error) ? output : error
            }
        };
    }

    private string? ExtractThreatName(string output)
    {
        // Extract threat name from ClamAV output
        // Format: "filename: ThreatName FOUND"
        var match = System.Text.RegularExpressions.Regex.Match(output, @":\s*(.+?)\s+FOUND");
        return match.Success ? match.Groups[1].Value : null;
    }

    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = "clamdscan",
                Arguments = "--version",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = startInfo };
            process.Start();
            await process.WaitForExitAsync();
            
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }
}
```

## Configuration Patterns

### Strongly-Typed Configuration
```csharp
public class ClamAVOptions
{
    public const string SectionName = "ClamAV";
    
    public string FileMountPath { get; set; } = "/files";
    public int ScanTimeoutSeconds { get; set; } = 180;
    public long MaxFileSizeBytes { get; set; } = 104857600; // 100MB
    public bool EnableDetailedLogging { get; set; } = false;
    public string ClamDScanPath { get; set; } = "clamdscan";
}

// In Program.cs
builder.Services.Configure<ClamAVOptions>(
    builder.Configuration.GetSection(ClamAVOptions.SectionName));
```

### Service Registration Pattern
```csharp
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddClamAVServices(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        services.Configure<ClamAVOptions>(
            configuration.GetSection(ClamAVOptions.SectionName));
            
        services.AddScoped<IClamAVService, ClamAVService>();
        services.AddScoped<IClamAVValidator, ClamAVValidator>();
        
        return services;
    }
}

// Usage in Program.cs
builder.Services.AddClamAVServices(builder.Configuration);
```

## Validation Patterns

### File Validation Service
```csharp
public interface IClamAVValidator
{
    ValidationResult ValidateFileName(string fileName);
    ValidationResult ValidateFileAccess(string filePath);
    ValidationResult ValidateFileSize(string filePath);
}

public class ClamAVValidator : IClamAVValidator
{
    private readonly ClamAVOptions _options;
    private readonly ILogger<ClamAVValidator> _logger;

    public ClamAVValidator(IOptions<ClamAVOptions> options, ILogger<ClamAVValidator> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public ValidationResult ValidateFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return ValidationResult.Failed("File name cannot be empty");
        }

        if (fileName.Contains("..") || fileName.Contains("/") || fileName.Contains("\\"))
        {
            return ValidationResult.Failed("Invalid file name format");
        }

        return ValidationResult.Success();
    }

    public ValidationResult ValidateFileAccess(string filePath)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                return ValidationResult.Failed("File does not exist");
            }

            using var stream = File.OpenRead(filePath);
            return ValidationResult.Success();
        }
        catch (UnauthorizedAccessException)
        {
            return ValidationResult.Failed("Access denied to file");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating file access: {FilePath}", filePath);
            return ValidationResult.Failed("Cannot access file");
        }
    }

    public ValidationResult ValidateFileSize(string filePath)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            if (fileInfo.Length > _options.MaxFileSizeBytes)
            {
                return ValidationResult.Failed(
                    $"File size {fileInfo.Length} exceeds maximum allowed size {_options.MaxFileSizeBytes}");
            }

            return ValidationResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating file size: {FilePath}", filePath);
            return ValidationResult.Failed("Cannot determine file size");
        }
    }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }

    public static ValidationResult Success() => new() { IsValid = true };
    public static ValidationResult Failed(string error) => new() { IsValid = false, ErrorMessage = error };
}
```

## Error Handling Patterns

### Custom Exception Types
```csharp
public class ClamAVException : Exception
{
    public ClamAVException(string message) : base(message) { }
    public ClamAVException(string message, Exception innerException) : base(message, innerException) { }
}

public class ClamAVScanException : ClamAVException
{
    public int ExitCode { get; }
    public string RawOutput { get; }

    public ClamAVScanException(int exitCode, string rawOutput, string message) 
        : base(message)
    {
        ExitCode = exitCode;
        RawOutput = rawOutput;
    }
}

public class ClamAVTimeoutException : ClamAVException
{
    public TimeSpan Timeout { get; }

    public ClamAVTimeoutException(TimeSpan timeout) 
        : base($"ClamAV scan timed out after {timeout.TotalSeconds} seconds")
    {
        Timeout = timeout;
    }
}
```

### Global Exception Handler
```csharp
public class ClamAVExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ClamAVExceptionMiddleware> _logger;

    public ClamAVExceptionMiddleware(RequestDelegate next, ILogger<ClamAVExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ClamAVException ex)
        {
            _logger.LogError(ex, "ClamAV operation failed");
            await HandleClamAVExceptionAsync(context, ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred");
            await HandleGenericExceptionAsync(context, ex);
        }
    }

    private static async Task HandleClamAVExceptionAsync(HttpContext context, ClamAVException ex)
    {
        context.Response.StatusCode = ex switch
        {
            ClamAVTimeoutException => 408,
            ClamAVScanException => 422,
            _ => 500
        };

        var response = new
        {
            Message = ex.Message,
            Type = ex.GetType().Name,
            Details = ex is ClamAVScanException scanEx ? scanEx.RawOutput : null
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}

// Registration in Program.cs
app.UseMiddleware<ClamAVExceptionMiddleware>();
```

## Testing Patterns

### Unit Test Patterns
```csharp
public class ClamAVServiceTests
{
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<ClamAVService>> _loggerMock;
    private readonly ClamAVService _service;

    public ClamAVServiceTests()
    {
        _configurationMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<ClamAVService>>();
        
        _configurationMock.Setup(c => c.GetValue("FILE_SHARE_MOUNT_PATH", "/files"))
                         .Returns("/test-files");
                         
        _service = new ClamAVService(_configurationMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task ScanFileAsync_FileNotFound_ReturnsFileNotFoundStatus()
    {
        // Arrange
        var fileName = "nonexistent.txt";

        // Act
        var result = await _service.ScanFileAsync(fileName);

        // Assert
        Assert.Equal(ScanStatus.FileNotFound, result.Status);
        Assert.Equal("File not found", result.Message);
    }

    [Fact]
    public async Task ScanFileAsync_CleanFile_ReturnsCleanStatus()
    {
        // Arrange
        var fileName = "clean-test.txt";
        await File.WriteAllTextAsync("/test-files/clean-test.txt", "This is a clean test file");

        // Act
        var result = await _service.ScanFileAsync(fileName);

        // Assert
        Assert.Equal(ScanStatus.Clean, result.Status);
        Assert.Contains("clean", result.Message, StringComparison.OrdinalIgnoreCase);
    }
}
```

### Integration Test Patterns
```csharp
public class ClamAVIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public ClamAVIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task ScanEndpoint_ValidFile_ReturnsOkResult()
    {
        // Arrange
        var fileName = "test-clean.txt";
        await CreateTestFile(fileName, "Clean test content");

        // Act
        var response = await _client.PostAsync($"/scan?fileName={fileName}", null);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ScanResult>(content);
        
        Assert.Equal(ScanStatus.Clean, result.Status);
    }

    private async Task CreateTestFile(string fileName, string content)
    {
        var testFilesPath = Path.Combine(Directory.GetCurrentDirectory(), "test-files");
        Directory.CreateDirectory(testFilesPath);
        await File.WriteAllTextAsync(Path.Combine(testFilesPath, fileName), content);
    }
}
```

## Docker Integration Patterns

### Multi-Stage Dockerfile Pattern
```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /App
COPY *.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -r linux-x64 --self-contained true -c Release -o out

# Runtime stage with ClamAV
FROM clamav/clamav-debian:1.4
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
COPY ./docker-entrypoint.sh /init
RUN chmod +x /init

# Create necessary directories and set permissions
RUN mkdir -p /app /run/clamav /tmp/files && \
    chown -R clamav:clamav /run/clamav /tmp/files /var/lib/clamav

# Copy application
COPY --from=build /App/out /app
RUN chmod +x /app/clamav-api
RUN mkdir /files && chown clamav:clamav /files

EXPOSE 8080
# Entrypoint starts clamd then setpriv --reuid=clamav for the API
ENTRYPOINT ["/init"]
```

### Docker Compose Pattern
```yaml
version: '3.8'
services:
  clamav:
    build: .
    ports:
      - "5900:8080"
    volumes:
      - ./files:/files:ro
      - clamav-db:/var/lib/clamav
    environment:
      - FILE_SHARE_MOUNT_PATH=/files
      - ASPNETCORE_URLS=http://+:8080
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  clamav-db:
```

These patterns provide a solid foundation for building reliable and maintainable ClamAV integrations while following .NET and containerization best practices.
