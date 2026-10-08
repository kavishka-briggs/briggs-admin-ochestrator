# Developer Quick Start

Welcome to Briggs System development! This guide will get you productive quickly, whether you're building APIs, frontend modules, infrastructure, or other components.

## What you're working with

**Briggs System is a secure, modular platform.** Think of it as a collection of independent components that work together through well-defined patterns. Whether you're building backend services, frontend microfrontends, infrastructure code, or other components, they all follow consistent security and architectural principles.

**Key principle:** Everything follows domain-driven design with centralized security. Components communicate through defined interfaces and maintain strict isolation boundaries.

## The 5-minute security briefing

Before you build anything, understand these non-negotiable principles:

### 🔐 Authentication flows through the gateway
- **Only KrakenD validates JWT tokens** - never build custom auth anywhere
- **Backend services receive pre-authenticated requests** - trust them, don't re-validate
- **Frontend modules authenticate through Keycloak** - use provided auth components
- **Infrastructure components inherit security context** - don't override security settings

### 🏠 Domain isolation is everywhere  
- **Each customer gets their own domain** - all components must respect this boundary
- **Always filter by domain** - in databases, APIs, frontend state, and infrastructure
- **Use the 4-level security model:** Domain → Account → Project → Office
- **Test isolation thoroughly** - data leaks between domains are critical security failures

### 📋 Policy documentation governs all development
- **Check `docs/policy/` first** when building any component
- **Policy overrides everything else** - if there's a conflict, policy wins
- **Use the assessment checklists** to verify all work meets requirements
- **Apply security patterns consistently** across all component types

**Why this matters:** These patterns ensure security and compliance regardless of what you're building.

## Setting up your project

### 1. Copy the essentials

Every project needs these core files:

```bash
# From the shared docs repository
cp -r docs/ ./docs/
cp .github/copilot-instructions.md ./.github/
cp templates/config.json ./config.json
```

Cursor users should install the Briggs
[`cursor-plugin`](https://github.com/Briggs-Walker/cursor-plugin). Do not copy
shared `.cursor/` files into each repository; keep project rules for local
exceptions only.

### 2. Configure your component

Edit `config.json` to match what you're building:

```json
{
  "plugin_id": "your-component-name",
  "name": "Your Component Display Name",
  "deployment_mode": "container", 
  "frontend_port": "3000",
  "backend_port": "8080",
  "gateway_path": "/api/your-component"
}
```

### 3. Add appropriate workflows

Choose the workflows that match your component type:

```bash
# For .NET APIs
cp templates/deployment/.github/workflows/backend-*.yaml ./.github/workflows/

# For React microfrontends  
cp templates/deployment/.github/workflows/frontend-*.yaml ./.github/workflows/

# For full-stack applications
cp -r templates/deployment/.github/workflows/ ./.github/workflows/

# For infrastructure-only projects (like gateway config)
# No deployment workflows needed - documentation only
```

**Note:** Skip deployment workflows for `briggs-orchestrator`, `briggsdesignsystem`, `auth`, `clamav-api`, `briggs-gateway-api` - they use custom deployment.

### 4. Choose your development path

**Building a .NET API or Service?**
- Follow the [.NET Stack Guide](stack/dotnet/) for patterns and examples
- Use Entity Framework for database access
- Follow the controller patterns for consistent APIs

**Building a React Microfrontend?**
- Follow the [React Stack Guide](stack/react/) for microfrontend patterns
- Use the design system components
- Follow the federation patterns for module loading

**Working with Infrastructure?**
- Follow the [KrakenD Guide](stack/krakend/) for gateway routing and security
- Follow the [Helm Guide](stack/helm/) for Kubernetes deployments
- Use Infrastructure as Code patterns for consistent deployments

**Building Supporting Components?**
- Follow the [Storybook Guide](stack/storybook/) for component documentation
- Follow the [CDC Guide](stack/cdc/) for data synchronization
- Follow the [ClamAV Guide](stack/clamav/) for virus scanning integration

## Essential patterns for all components

### Domain isolation (applies to everything)
```csharp
// Backend: ALWAYS include domain filtering
var results = context.YourTable
    .Where(x => x.DomainId == userDomainId)
    .ToList();
```

```javascript
// Frontend: Filter state by domain
const filteredData = allData.filter(item => item.domainId === currentDomain);
```

```yaml
# Infrastructure: Namespace by domain
apiVersion: v1
kind: Namespace
metadata:
  name: "${DOMAIN_ID}-${COMPONENT_NAME}"
```

### Authentication integration
```csharp
// Backend APIs: Controllers receive authenticated requests
[ApiController]
[Route("api/[controller]")]
public class YourController : ControllerBase
{
    // Domain isolation is already handled by the gateway
    // Just build your business logic
}
```

```javascript
// Frontend: Use auth context
import { useAuth } from '@briggs/auth-context';

const MyComponent = () => {
    const { user, domain } = useAuth();
    // Component logic here
};
```

### Error handling patterns
```csharp
// Backend: Consistent error responses
try 
{
    // Your logic
}
catch (Exception ex)
{
    _logger.LogError(ex, "Operation failed");
    return Problem("Something went wrong");
}
```

```javascript
// Frontend: Consistent error handling
try {
    // Your logic
} catch (error) {
    console.error('Operation failed:', error);
    showErrorNotification('Something went wrong');
}
```

### Configuration management
```csharp
// Backend: Use configuration patterns
public class YourService
{
    private readonly string _connectionString;
    
    public YourService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection");
    }
}
```

```javascript
// Frontend: Environment-based configuration
const config = {
    apiUrl: process.env.REACT_APP_API_URL,
    domain: process.env.REACT_APP_DOMAIN
};
```

## Your development workflow

### 1. Understand your component's role
- **Read the requirements** - what problem are you solving?
- **Check existing patterns** - is there already a similar component?
- **Identify dependencies** - what other components do you need to integrate with?
- **Plan your interfaces** - how will other components interact with yours?

### 2. Plan your security approach
- **Review security requirements** in `docs/policy/`
- **Understand your data sensitivity** - what protection does it need?
- **Plan your domain isolation** - how will you maintain boundaries?
- **Consider authentication flow** - how do users access your component?

### 3. Build incrementally
- **Start with basic structure** - get the foundation working
- **Add core functionality** - implement one feature at a time
- **Test domain isolation** - verify boundaries are maintained
- **Integrate with other components** - test communication patterns

### 4. Test and deploy
- **Run security assessments** using `docs/policy/iso-assessment-checklist.md`
- **Test across domains** - ensure isolation works correctly
- **Deploy through CI/CD** - use the appropriate GitHub Actions workflows
- **Monitor and validate** - check logs, performance, and behavior

## Common questions for all developers

**Q: Where do I put my business logic?**  
A: **Backend:** Service layer classes. **Frontend:** Custom hooks or service modules. **Infrastructure:** Configuration files and templates.

**Q: How do I handle data access?**  
A: **Backend:** Entity Framework with domain filtering. **Frontend:** API calls through axios/fetch. **Infrastructure:** Database connection strings in config.

**Q: Do I need to handle authentication?**  
A: **Backend:** No, receive pre-authenticated requests. **Frontend:** Use auth context components. **Infrastructure:** Inherit security from platform.

**Q: How do I handle different customers?**  
A: **All components:** Always filter by domain. Use domain context provided by the platform.

**Q: Where do I find examples?**  
A: Check `docs/stack/[your-technology]/` for patterns, examples, and troubleshooting guides.

**Q: How do I communicate with other components?**  
A: **Backend to Backend:** HTTP calls through gateway. **Frontend to Backend:** API calls. **Infrastructure:** Service discovery and networking configs.

**Q: What about testing?**  
A: **All components:** Test domain isolation thoroughly. Use provided testing patterns in your stack documentation.

**Q: How do I handle configuration?**  
A: **All components:** Use environment variables and config files. Never hardcode sensitive values.

## When you get stuck

### Quick troubleshooting
1. **Check your technology's guide** in `docs/stack/[technology]/` for specific troubleshooting
2. **Verify your configuration** - is `config.json` correct for your component type?
3. **Test domain isolation** - are you maintaining proper boundaries?
4. **Check workflows** - are deployment/build processes configured correctly?
5. **Review dependencies** - are all required components available and configured?

### Getting help by component type

**🛡️ Security questions (all components)**  
Start with `docs/policy/` - these apply to everything you build

**🏗️ Architecture questions**  
Check `docs/application-architecture.md` and `docs/domain-architecture.md`

**💻 Backend development**  
See `docs/stack/dotnet/` for API patterns, database access, and service architecture

**⚛️ Frontend development**  
See `docs/stack/react/` for microfrontend patterns, state management, and component design

**🛠️ Infrastructure work**  
See `docs/stack/krakend/` for gateway config and `docs/stack/helm/` for Kubernetes deployments

**🗄️ Database questions**  
See `docs/databases/` for schemas, access patterns, and security requirements

### Advanced topics for any component type
Once you're comfortable with the basics:
- **Performance optimization** → Check your stack's performance guides
- **Testing strategies** → Component-specific testing patterns in your stack docs
- **CI/CD customization** → Advanced workflow configurations
- **Monitoring and logging** → Production operational patterns
- **Integration patterns** → How components communicate effectively

## What's next?

### After your first successful component:
1. **Read the full architecture docs** - understand how all components connect
2. **Explore advanced patterns** - learn optimization techniques for your component type
3. **Contribute improvements** - help make the platform better for everyone
4. **Mentor new developers** - share what you've learned

### Continuous learning paths:
- **Stay current with security policies** - they evolve as threats and requirements change
- **Learn from other components** - see how similar problems are solved across the platform
- **Participate in architecture discussions** - help shape the platform's evolution
- **Share knowledge** - document new patterns and solutions you discover
- **Cross-train on other component types** - understand the full system better

### Component-specific growth:
- **Backend developers** → Learn frontend patterns to build better APIs
- **Frontend developers** → Understand backend constraints to build better UX
- **Infrastructure developers** → Learn application patterns to build better platforms
- **Full-stack developers** → Deepen expertise in specific areas while maintaining breadth

---

**Remember:** The goal is secure, maintainable components that follow our established patterns. When in doubt, check the documentation hierarchy:

1. **Policy docs** (`docs/policy/`) - Always wins
2. **Architecture principles** - Must follow policy  
3. **Component-specific patterns** - Must follow architecture and policy
4. **Reference materials** - Supporting information

**You've got this!** The platform is designed to make secure development straightforward across all component types. Focus on solving problems - the security and architectural patterns are already figured out.
