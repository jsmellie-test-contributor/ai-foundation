---
name: csharp_base
version: 1.1.2
description: Core C# coding standards for all .NET projects
tags: [csharp]
depends_on: []
---

# Standards: C# Base

---

## Stack Baseline

| Layer         | Library / Version                         |
| ------------- | ----------------------------------------- |
| Language      | C# 12+ (.NET 8+)                          |
| Serialization | System.Text.Json (preferred)              |
| Testing       | xUnit                                     |
| Logging       | Microsoft.Extensions.Logging (structured) |

---

## Project Configuration

### Nullable Reference Types

- `<Nullable>enable</Nullable>` is required in all projects
- `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` for nullable warnings
- All public APIs must use `?` annotations to express intent
- No suppression (`!`) without a comment explaining why

### File-Scoped Namespaces

All files use file-scoped namespace syntax:

```csharp
namespace MyApp.Services;
```

Never use block-scoped namespaces.

### Global Usings

- One `GlobalUsings.cs` per project
- Only namespaces used in 90%+ of files qualify for inclusion
- All other imports remain per-file
- SDK implicit usings are acceptable as-is

### `.editorconfig`

Style rules in this standard are enforced via `.editorconfig` in each project.
See `aif init` for the project template. If no `.editorconfig` exists, the agent should ask whether to generate one.

---

## Naming Conventions

| Construct       | Convention                   | Example             |
| --------------- | ---------------------------- | ------------------- |
| Classes         | PascalCase                   | `DataParser`        |
| Interfaces      | PascalCase with `I` prefix   | `IDataParser`       |
| Methods         | PascalCase                   | `ParseFile()`       |
| Async methods   | PascalCase + `Async` suffix  | `ParseFileAsync()`  |
| Properties      | PascalCase                   | `FileName`          |
| Private fields  | `_camelCase`                 | `_dataParser`       |
| Local variables | camelCase                    | `parsedResult`      |
| Constants       | PascalCase                   | `MaxRetryCount`     |
| Enums           | PascalCase (type and values) | `FileFormat.Csv`    |
| Namespaces      | `{Project}.{Layer}`          | `CNS.Core.Services` |

---

## Type Inference and Declarations

### Avoid `var` — Use Explicit Types

Do not use `var`. Always declare the type explicitly on the left side of the assignment.

### Prefer Target-Typed `new`

Use target-typed `new()` on the right when constructing:

```csharp
// Correct — type on left, concise construction on right
List<string> names = new();
Dictionary<string, int> counts = new();
EmailSettings settings = new() { SmtpHost = "localhost" };

// Wrong — var hides the type
var names = new List<string>();
var counts = new Dictionary<string, int>();
```

When the right-hand side is a method call or expression (not a constructor), the explicit type on the left provides readability:

```csharp
// Correct — type visible at a glance
List<User> activeUsers = GetActiveUsers();
ParseResult result = parser.ParseAsync(input);

// Wrong
var activeUsers = GetActiveUsers();
var result = parser.ParseAsync(input);
```

### Access Modifiers

Always state access modifiers explicitly. Never rely on defaults:

```csharp
private int _count;
private void DoWork() { }
internal static class Helpers { }
```

---

## Expression and Syntax Preferences

### Expression-Bodied Members

Use `=>` for single-expression members only. Use block bodies for anything more complex:

```csharp
// Good — single expression
public string FullName => $"{First} {Last}";
public int Count => _items.Count;
public override string ToString() => $"{Name} ({Id})";

// Good — multi-statement uses block body
public decimal CalculateTotal()
{
    decimal subtotal = _items.Sum(i => i.Price);
    decimal tax = subtotal * TaxRate;
    return subtotal + tax;
}
```

### Primary Constructors

Do not use primary constructors. Always use traditional constructors with explicit `private readonly` fields:

```csharp
// Correct
public class UserService
{
    private readonly ILogger<UserService> _logger;
    private readonly IUserRepository _repo;

    public UserService(ILogger<UserService> logger, IUserRepository repo)
    {
        _logger = logger;
        _repo = repo;
    }
}

// Wrong — primary constructor
public class UserService(ILogger<UserService> logger, IUserRepository repo) { }
```

### Pattern Matching

Use pattern matching broadly, including `switch` expressions, type patterns, and null checks:

```csharp
// Type checks
if (obj is string text) { }
if (result is null) { }
if (value is not null) { }

// Switch expressions
string label = status switch
{
    Status.Active => "Running",
    Status.Paused => "On hold",
    _ => "Unknown"
};
```

**Cap property pattern nesting at one level.** If a pattern reaches into nested objects, break it into named conditions:

```csharp
// Good — one level of property pattern
if (order is { Total: > 100 })

// Bad — too deeply nested
if (order is { Customer: { Address: { Country: "NZ" } } })

// Good — break into named condition
bool isNzCustomer = order.Customer.Address.Country == "NZ";
if (order is { Total: > 100 } && isNzCustomer)
```

### Collection Expressions

Use collection expressions (`[]`) for simple initialisation with literals and simple variables:

```csharp
// Good — simple cases
List<string> names = ["Alice", "Bob"];
int[] numbers = [1, 2, 3];
List<int> combined = [..first, ..second];
```

Break complex spreads (method calls, LINQ results) into named variables first:

```csharp
// Wrong — complex expression inside spread
List<int> all = [..GetActiveIds(), ..users.Where(u => u.IsAdmin).Select(u => u.Id)];

// Correct — named intermediates
List<int> activeIds = GetActiveIds();
List<int> adminIds = users.Where(u => u.IsAdmin).Select(u => u.Id).ToList();
List<int> all = [..activeIds, ..adminIds];
```

---

## String Handling

### Composition

- **String interpolation** (`$""`) for inline string building
- **`string.Format`** when the template comes from a resource file, config, or is not known at compile time
- **`StringBuilder`** when concatenating in a loop or building 4+ dynamic segments

```csharp
// Interpolation — inline
string message = $"Hello {user.Name}, you have {count} items";

// string.Format — template from resource
string template = Resources.GetString("WelcomeMessage");
string message = string.Format(template, user.Name);

// StringBuilder — loop
StringBuilder sb = new();
foreach (string line in lines)
{
    sb.AppendLine(line);
}
```

### Comparisons

- **External/user-facing data:** Always specify `StringComparison` explicitly
- **Internal identifiers:** `==` is acceptable (ordinal by default)

```csharp
// External data — explicit comparison
if (input.Equals("admin", StringComparison.OrdinalIgnoreCase)) { }
if (fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)) { }

// Internal identifiers — == is fine
if (settingKey == "MaxRetries") { }
```

---

## Async/Await

### General Rules

- Always return `Task` or `Task<T>`. Never use `async void` except in framework-mandated event handler signatures.
- Always use `Task<T>`. Use `ValueTask<T>` only as a profiled optimisation exception.
- Do not use `ConfigureAwait`. It is unnecessary in .NET 8+ application code.
- Accept `CancellationToken` on all I/O-bound async methods.

### Naming

- All async methods use the `Async` suffix: `LoadDataAsync()`, `SaveFileAsync()`

---

## Exception Handling

### Strategy

- **Exceptions for exceptional cases** — I/O failures, invalid state, programmer errors
- **`TryX` pattern or nullable returns for expected failures** — parsing, lookups, validation

```csharp
// Expected failure — TryX pattern
if (int.TryParse(input, out int value))
{
    // use value
}

// Expected failure — nullable return
User? user = await _repo.FindByEmailAsync(email);
if (user is null)
{
    // handle not found
}

// Exceptional case — throw
throw new InvalidOperationException("Connection pool exhausted");
```

### Custom Exceptions

- Prefer built-in exceptions (`InvalidOperationException`, `ArgumentException`, `ArgumentNullException`, `NotSupportedException`) wherever they fit
- Create custom exceptions only when callers need to catch a specific domain failure by type
- Custom exceptions inherit from `Exception` and follow the `{Domain}Exception` naming pattern

### Re-throwing

- Always use `throw;` to preserve the stack trace
- Never use `throw ex;` — it resets the stack trace
- When wrapping, pass the original as the inner exception:

```csharp
catch (HttpRequestException ex)
{
    throw new DataSyncException("Failed to sync user data", ex);
}
```

---

## Resource Disposal

### `using` Style

- Prefer `using` declarations (no braces) by default
- Use block `using` statements when disposal must occur before method end

```csharp
// Default — declaration, disposed at method exit
using FileStream stream = new("file.txt", FileMode.Open, FileAccess.Read);

// Narrower scope needed — block style
using (FileStream tempStream = new("temp.dat", FileMode.Create))
{
    await WriteDataAsync(tempStream);
}
// tempStream disposed here, before continuing
await ProcessResultAsync();
```

### `IDisposable` and `IAsyncDisposable`

- Implement `IAsyncDisposable` on classes that hold async resources (DB connections, HTTP clients, streams used with async I/O)
- Pair with `IDisposable` when synchronous disposal is feasible
- Do not force `IDisposable` if the class genuinely has no synchronous disposal path
- Always use `await using` for `IAsyncDisposable` types

---

## LINQ

### Method Syntax Only

Always use method syntax (`.Where()`, `.Select()`, `.OrderBy()`). Do not use query syntax (`from x in y select z`).

### Chain Length

Cap LINQ chains at approximately 5 operations. Beyond that, break into named intermediate variables:

```csharp
// Good — under 5
List<string> activeNames = users
    .Where(u => u.IsActive)
    .OrderBy(u => u.LastName)
    .Select(u => u.FullName)
    .ToList();

// Bad — too long, hard to debug
List<ReportRow> rows = orders
    .Where(o => o.Status == Status.Complete)
    .GroupBy(o => o.CustomerId)
    .Select(g => new { Id = g.Key, Total = g.Sum(o => o.Amount) })
    .Where(x => x.Total > 1000)
    .OrderByDescending(x => x.Total)
    .Take(50)
    .Select(x => BuildReportRow(x.Id, x.Total))
    .ToList();

// Good — broken into named steps
IEnumerable<IGrouping<int, Order>> grouped = orders
    .Where(o => o.Status == Status.Complete)
    .GroupBy(o => o.CustomerId);

List<ReportRow> rows = grouped
    .Select(g => new { Id = g.Key, Total = g.Sum(o => o.Amount) })
    .Where(x => x.Total > 1000)
    .OrderByDescending(x => x.Total)
    .Take(50)
    .Select(x => BuildReportRow(x.Id, x.Total))
    .ToList();
```

### Materialisation

Materialise (`.ToList()`, `.ToArray()`) before:

- Passing results across method boundaries
- Storing in fields or properties
- Iterating multiple times

Never return `IEnumerable<T>` backed by a deferred query from a public method.

---

## Project Structure

### One Type Per File

- Each file contains one primary type. File name matches the type name exactly.
- Small supporting types (enums, DTOs) may co-locate only if:
  - They are solely used by the primary type
  - They are preferably `internal` or nested
  - They move to their own file if used elsewhere or grow beyond trivial

### Folder-to-Namespace Mapping

Strict 1:1 mapping. Folder path must match namespace:

```
Services/Auth/TokenService.cs → MyApp.Services.Auth.TokenService
Models/User.cs               → MyApp.Models.User
```

No exceptions. If a namespace has only one class, that is a signal to merge it up — not to break the mapping.

---

## Dependency Injection

### Service Lifetimes

| Lifetime  | When to use                                                 |
| --------- | ----------------------------------------------------------- |
| Singleton | Stateless services, caches, configuration, connection pools |
| Scoped    | Per-request/per-operation state (DB contexts, unit of work) |
| Transient | Lightweight, no shared state, cheap to construct            |

**Lifetime rule:** A service may only depend on services with an equal or longer lifetime. Transient can depend on anything. Scoped can depend on Scoped or Singleton.
Singleton can only depend on Singleton.

### Registration Pattern

Each project or feature layer exposes an extension method for its registrations:

```csharp
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddAuthServices(this IServiceCollection services)
    {
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}

// Program.cs stays clean
builder.Services.AddAuthServices();
builder.Services.AddDataServices();
```

### Configuration Injection

- **Static config:** Bind to a POCO class and register directly as a singleton
- **Hot-reload config:** Use `IOptionsMonitor<T>` for settings that may change at runtime
- **Never inject raw `IConfiguration`** — it is untyped and untestable

```csharp
// Static config — direct POCO
EmailSettings emailSettings = builder.Configuration
    .GetSection("Email")
    .Get<EmailSettings>();
services.AddSingleton(emailSettings);

// Hot-reload config — IOptionsMonitor
services.Configure<FeatureFlags>(config.GetSection("Features"));
// Consumer uses IOptionsMonitor<FeatureFlags> and reads .CurrentValue
```

---

## File Header Block

Every `.cs` file must begin with a header comment:

```csharp
// ------------------------------
// {FileName}.cs
//
// Author: {AuthorName} - {YYYY-MM-DD}
// Plan: {Plan ID}
//
// Copyright (c) {Company}. All rights reserved.
// ------------------------------
```

Rules:

- **Never omit the header.** Every `.cs` file gets one regardless of size or purpose.
- `Author` is whoever created the file. If an AI agent creates it, use the configured AI identity name.
- `Plan` is the Plan ID that caused this file to be created or meaningfully modified.
- If a file is modified under a new plan, add the new Plan ID (do not remove the original).

---

## XML Documentation

All `public` and `protected` members require XML doc comments:

```csharp
/// <summary>
/// {One sentence summary.}
/// </summary>
/// <param name="{name}">{Description}</param>
/// <returns>{What is returned and under what conditions}</returns>
public async Task<ParseResult> ParseAsync(string filePath, CancellationToken ct = default)
```

Rules:

- `<summary>` is mandatory on all public types, methods, and properties.
- `<param>` is mandatory for every parameter.
- `<returns>` is mandatory for non-void methods.
- `<exception>` is required when a method intentionally throws.
- Internal/private members: XML docs encouraged but not mandatory.

---

## `using` Statement Order

1. `System.*`
2. External packages (alphabetical)
3. Internal project namespaces (alphabetical)

Blank line between each group.

---

## Data Models

### Preferences

- Prefer `record` for immutable data-transfer objects and value-like types
- Prefer `struct` for small, stack-allocated value types (< 16 bytes, no reference fields)
- Prefer `class` only when mutability or inheritance is genuinely required

### Equality

For types used in collections, comparisons, or reactive bindings, implement:

- `IEquatable<T>`
- `override bool Equals(object? obj)`
- `override int GetHashCode()`
- `==` and `!=` operators

---

## Interface Pattern

```csharp
/// <summary>
/// Defines the contract for {service purpose}.
/// </summary>
public interface I{ServiceName}
{
    /// <summary>{Description}</summary>
    Task<{Result}> {MethodName}Async({Parameters}, CancellationToken ct = default);
}
```

Rules:

- Services are accessed via interface — never instantiate concrete classes directly from consumers.
- Use constructor injection for dependency resolution.
- Factory pattern for services that differ between environments (e.g., real filesystem vs test double).

---

## Region Organisation

For files over ~100 lines, use regions in this order:

```csharp
#region Constants
#region Fields
#region Constructor
#region Public Methods
#region Protected Methods
#region Private Methods
```

Files under 100 lines do not need regions.

---

## Security Requirements

These apply to every C# plan's security checklist:

- [ ] Nullable reference types enabled — no unguarded dereferences
- [ ] File paths constructed using `Path.Combine` or `Path.Join` — never string concatenation
- [ ] `FileStream` opened with explicit `FileAccess` and `FileShare` modes
- [ ] JSON deserialization uses typed targets — no `dynamic` or `JObject` without validation
- [ ] `async`/`await` I/O operations accept `CancellationToken` where the operation may be long-running
- [ ] Exception messages displayed to users are friendly — no stack traces or internal paths
- [ ] No `Debug.WriteLine` calls that output sensitive data remain in release builds
- [ ] No hardcoded file paths — use configuration or path abstractions
- [ ] String comparisons on external data use explicit `StringComparison`

---

## Logging Requirements

Framework: `Microsoft.Extensions.Logging` with structured logging.

For smaller projects where MEL is not yet configured, `Debug.WriteLine` is acceptable during development but must follow the same data-safety rules.

### Log Format

```
{ClassName} - {MethodName} - {Event} | {Key}:{Value} | {Key}:{Value}
```

### Log Level Guide

| Level   | When to use                                           |
| ------- | ----------------------------------------------------- |
| Debug   | Entry/exit of significant methods, state transitions  |
| Info    | User-visible milestones (file saved, data loaded)     |
| Warning | Handled exceptions, unexpected but recoverable states |
| Error   | Operation failed, action could not complete           |
| Fatal   | Application cannot continue                           |

---

## Testing Requirements

Framework: `xUnit`

### Test File Structure

```
{ProjectName}.Tests/
└── {Layer}/
    └── {ComponentName}Tests.cs
```

### Test Naming Convention

```
{MethodName}_{Scenario}_{ExpectedResult}
```

Examples:

```csharp
[Fact]
public void Parse_ValidCsvInput_ReturnsExpectedRows() { }

[Fact]
public void Parse_EmptyInput_ReturnsEmptyResult() { }

[Fact]
public async Task ParseAsync_FileNotFound_ThrowsFileNotFoundException() { }
```

### Minimum Coverage Rule

Every public method must have:

- At least one happy-path test
- At least one test for each documented failure condition
- At least one null/empty input test if the method accepts reference types or strings

### Test Organisation

- One test class per production class
- Test class name: `{ProductionClassName}Tests`
- Use `[Theory]` with `[InlineData]` or `[MemberData]` for parameterized cases
- Keep test methods focused — one assertion per logical concept (multiple `Assert` calls are fine if they verify one thing)
