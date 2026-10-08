# API Development Standards

**MANDATORY STANDARDS**: ISO standardized data formats required for all API development.

> **AI OPTIMIZATION**: This document provides mandatory API development standards. AI agents must reference these requirements when creating or modifying APIs, endpoints, or data structures.

---

## 🌍 **ISO Standardized Data Formats - MANDATORY**

### **Geographic and Language Standards**

All APIs and endpoints **MUST** use ISO standardized data formats for geographic and language data:

#### **Country Codes - ISO 3166-1 alpha-2 (MANDATORY)**
- **Format**: Two-letter country codes (e.g., "NL", "BE", "FR", "DE", "UK")
- **Usage**: All country references in APIs, databases, and data exchanges
- **Examples**:
  ```json
  {
    "countryCode": "NL",  // ✅ CORRECT: ISO 3166-1 alpha-2
    "country": "Netherlands"  // ❌ WRONG: Use countryCode instead
  }
  ```

#### **Language Codes - ISO 639-1 (MANDATORY)**
- **Format**: Two-letter language codes (e.g., "en", "nl", "fr", "de")
- **Usage**: All language preferences, localization, and content language indicators
- **Examples**:
  ```json
  {
    "languageCode": "nl",  // ✅ CORRECT: ISO 639-1
    "language": "Dutch"    // ❌ WRONG: Use languageCode instead
  }
  ```

#### **Currency Codes - ISO 4217 (MANDATORY)**
- **Format**: Three-letter currency codes (e.g., "EUR", "USD", "GBP")
- **Usage**: All monetary values, pricing, and financial data
- **Examples**:
  ```json
  {
    "amount": 150.00,
    "currencyCode": "EUR"  // ✅ CORRECT: ISO 4217
  }
  ```

### **Additional ISO Standards**

#### **Date and Time - ISO 8601 (MANDATORY)**
- **Format**: YYYY-MM-DDTHH:mm:ss.sssZ (UTC) or with timezone offset
- **Usage**: All date/time fields in APIs
- **Examples**:
  ```json
  {
    "createdAt": "2025-06-16T14:30:00.000Z",     // ✅ CORRECT: ISO 8601 UTC
    "updatedAt": "2025-06-16T16:30:00.000+02:00" // ✅ CORRECT: ISO 8601 with timezone
  }
  ```

#### **Phone Numbers - E.164 Format (RECOMMENDED)**
- **Format**: +[country code][number] (e.g., "+31612345678")
- **Usage**: All phone number fields
- **Examples**:
  ```json
  {
    "phoneNumber": "+31612345678"  // ✅ CORRECT: E.164 format
  }
  ```

---

## 📝 **API Design Requirements**

### **Request/Response Models**

All API models **MUST** include ISO standardized fields where applicable:

```csharp
// ✅ CORRECT: API model with ISO standards
public class CreateLocationRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [StringLength(2, MinimumLength = 2)]
    [RegularExpression("^[A-Z]{2}$", ErrorMessage = "Must be ISO 3166-1 alpha-2 country code")]
    public string CountryCode { get; set; } = string.Empty;  // ISO 3166-1 alpha-2
    
    [StringLength(2, MinimumLength = 2)]
    [RegularExpression("^[a-z]{2}$", ErrorMessage = "Must be ISO 639-1 language code")]
    public string? LanguageCode { get; set; }  // ISO 639-1
    
    [StringLength(3, MinimumLength = 3)]
    [RegularExpression("^[A-Z]{3}$", ErrorMessage = "Must be ISO 4217 currency code")]
    public string? CurrencyCode { get; set; }  // ISO 4217
}

// ✅ CORRECT: Response model with ISO standards
public class LocationResponse
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;  // ISO 3166-1 alpha-2
    public string? LanguageCode { get; set; }  // ISO 639-1
    public string? CurrencyCode { get; set; }  // ISO 4217
    public DateTime CreatedAt { get; set; }  // ISO 8601 (handled by serialization)
}
```

### **Database Schema Requirements**

Database fields **MUST** use ISO standardized formats:

```sql
-- ✅ CORRECT: Database schema with ISO standards
CREATE TABLE Locations (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    CountryCode CHAR(2) NOT NULL,  -- ISO 3166-1 alpha-2
    LanguageCode CHAR(2) NULL,     -- ISO 639-1
    CurrencyCode CHAR(3) NULL,     -- ISO 4217
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Add constraints to enforce ISO standards
ALTER TABLE Locations ADD CONSTRAINT CK_Locations_CountryCode 
    CHECK (CountryCode LIKE '[A-Z][A-Z]');
    
ALTER TABLE Locations ADD CONSTRAINT CK_Locations_LanguageCode 
    CHECK (LanguageCode IS NULL OR LanguageCode LIKE '[a-z][a-z]');
    
ALTER TABLE Locations ADD CONSTRAINT CK_Locations_CurrencyCode 
    CHECK (CurrencyCode IS NULL OR CurrencyCode LIKE '[A-Z][A-Z][A-Z]');
```

---

## 🛡️ **Validation and Enforcement**

### **Request Validation**

All API endpoints **MUST** validate ISO format compliance:

```csharp
public class IsoCountryCodeAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is not string countryCode) return false;
        return countryCode.Length == 2 && countryCode.All(char.IsUpper);
    }
    
    public override string FormatErrorMessage(string name)
    {
        return $"{name} must be a valid ISO 3166-1 alpha-2 country code (e.g., 'NL', 'BE')";
    }
}

public class IsoLanguageCodeAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is null) return true; // Allow null for optional fields
        if (value is not string languageCode) return false;
        return languageCode.Length == 2 && languageCode.All(char.IsLower);
    }
    
    public override string FormatErrorMessage(string name)
    {
        return $"{name} must be a valid ISO 639-1 language code (e.g., 'en', 'nl')";
    }
}

// Usage in models
public class CreateLocationRequest
{
    [Required]
    [IsoCountryCode]
    public string CountryCode { get; set; } = string.Empty;
    
    [IsoLanguageCode]
    public string? LanguageCode { get; set; }
}
```

### **Service Layer Validation**

Services **MUST** validate ISO standards before processing:

```csharp
public class LocationService : ILocationService
{
    private readonly HashSet<string> _validCountryCodes = new()
    {
        "NL", "BE", "FR", "DE", "UK", "US", "CA", "AU", // Add all supported countries
    };
    
    private readonly HashSet<string> _validLanguageCodes = new()
    {
        "en", "nl", "fr", "de", "es", "it", // Add all supported languages
    };
    
    public async Task<Result<Location>> CreateLocationAsync(CreateLocationRequest request)
    {
        // Validate ISO standards
        if (!_validCountryCodes.Contains(request.CountryCode))
        {
            return Result<Location>.Failure($"Unsupported country code: {request.CountryCode}");
        }
        
        if (request.LanguageCode != null && !_validLanguageCodes.Contains(request.LanguageCode))
        {
            return Result<Location>.Failure($"Unsupported language code: {request.LanguageCode}");
        }
        
        // Continue with business logic...
    }
}
```

---

## 📋 **Implementation Checklist**

### **For Every New API Endpoint:**
- [ ] **Country Codes**: Use ISO 3166-1 alpha-2 format (2-letter, uppercase)
- [ ] **Language Codes**: Use ISO 639-1 format (2-letter, lowercase)
- [ ] **Currency Codes**: Use ISO 4217 format (3-letter, uppercase)
- [ ] **Dates/Times**: Use ISO 8601 format with timezone information
- [ ] **Phone Numbers**: Use E.164 format (recommended)
- [ ] **Validation**: Implement proper validation attributes
- [ ] **Database Constraints**: Add CHECK constraints for format validation
- [ ] **Documentation**: Document all ISO standards used in API documentation

### **For Database Schema Updates:**
- [ ] **Field Names**: Use standardized naming (countryCode, languageCode, currencyCode)
- [ ] **Data Types**: Use appropriate length constraints (CHAR(2), CHAR(3))
- [ ] **Constraints**: Add CHECK constraints for format validation
- [ ] **Indexes**: Consider indexing on ISO code fields for performance
- [ ] **Migration**: Include data migration scripts for existing data

### **For Frontend Integration:**
- [ ] **Dropdown Values**: Use ISO codes as values, display names as labels
- [ ] **Form Validation**: Validate ISO formats client-side and server-side
- [ ] **User Experience**: Show user-friendly names while storing ISO codes
- [ ] **Error Messages**: Provide clear error messages for invalid formats

---

## 🚨 **Common Violations to Avoid**

### **❌ WRONG Examples:**

```json
// ❌ WRONG: Non-standard country formats
{
    "country": "Netherlands",      // Use countryCode: "NL" instead
    "countryName": "Belgium",      // Use countryCode: "BE" instead
    "countryISO": "FRA"           // Use countryCode: "FR" instead (alpha-2, not alpha-3)
}

// ❌ WRONG: Non-standard language formats
{
    "language": "Dutch",           // Use languageCode: "nl" instead
    "locale": "en_US",            // Use languageCode: "en" for language only
    "lang": "English"             // Use languageCode: "en" instead
}

// ❌ WRONG: Non-standard currency formats
{
    "currency": "Euro",           // Use currencyCode: "EUR" instead
    "currencySymbol": "€",        // Use currencyCode: "EUR" instead
    "money": "USD"                // Use currencyCode: "USD" instead
}
```

### **✅ CORRECT Examples:**

```json
// ✅ CORRECT: ISO standardized formats
{
    "countryCode": "NL",          // ISO 3166-1 alpha-2
    "languageCode": "nl",         // ISO 639-1
    "currencyCode": "EUR",        // ISO 4217
    "createdAt": "2025-06-16T14:30:00.000Z"  // ISO 8601
}
```

---

## 📖 **Related Documentation**

### **Development Standards**
- [`policy/iso-security-policy.md`](policy/iso-security-policy.md) - Security policy requirements
- [`stack/dotnet/dotnet-controller-patterns.md`](stack/dotnet/dotnet-controller-patterns.md) - Controller implementation patterns
- [`stack/dotnet/dotnet-data-models.md`](stack/dotnet/dotnet-data-models.md) - Data model best practices
- [`stack/dotnet/dotnet-validation-security.md`](stack/dotnet/dotnet-validation-security.md) - Validation patterns

### **Assessment Integration**
- [`policy/iso-assessment-checklist.md`](policy/iso-assessment-checklist.md) - Security assessment requirements
- [`policy/iso-rfc-template.md`](policy/iso-rfc-template.md) - Change request templates

---

**🚨 CRITICAL**: These ISO standards are **MANDATORY** for all new API development and must be verified during code reviews and security assessments. Non-compliance will result in rejected deployments.
