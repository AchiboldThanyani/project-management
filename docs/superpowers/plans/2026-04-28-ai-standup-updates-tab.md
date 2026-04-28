# AI Standup — Updates Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Updates tab to the project detail view that uses Claude to generate per-member standup summaries from existing ActivityLog and TimeLog data, with both manual and scheduled generation.

**Architecture:** Four new backend components — `StandupSettings` (schedule config per project), `StandupReport` (stored AI output), `StandupGeneratorService` (shared generation logic), and `StandupSchedulerService` (BackgroundService). The frontend adds an `UpdatesTabComponent` that shows the latest report as a card grid and collapses history below it.

**Tech Stack:** .NET 9 Clean Architecture, MediatR CQRS, EF Core + PostgreSQL, Npgsql TimeOnly support, Angular 20 signals, `IClaudeService.AskAsync`, System.Text.Json.

---

## File Map

**Create (Backend):**
- `backend/src/ProjectManagement.Domain/Entities/StandupSettings.cs`
- `backend/src/ProjectManagement.Domain/Entities/StandupReport.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IStandupSettingsRepository.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IStandupReportRepository.cs`
- `backend/src/ProjectManagement.Application/Interfaces/ITimeLogRepository.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IStandupGeneratorService.cs`
- `backend/src/ProjectManagement.Application/Services/StandupGeneratorService.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupSettingsDto.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupReportDto.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupReportSummaryDto.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupMemberSummaryDto.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GetStandupSettings/GetStandupSettingsQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GetStandupSettings/GetStandupSettingsQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/UpdateStandupSettings/UpdateStandupSettingsCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/UpdateStandupSettings/UpdateStandupSettingsCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GenerateStandup/GenerateStandupCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GenerateStandup/GenerateStandupCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReports/GetStandupReportsQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReports/GetStandupReportsQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReport/GetStandupReportQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReport/GetStandupReportQueryHandler.cs`
- `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupSettingsConfiguration.cs`
- `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupReportConfiguration.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/StandupSettingsRepository.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/StandupReportRepository.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/TimeLogRepository.cs`
- `backend/src/ProjectManagement.Infrastructure/BackgroundServices/StandupSchedulerService.cs`
- `backend/src/ProjectManagement.WebApi/Controllers/StandupController.cs`
- `backend/tests/ProjectManagement.Application.Tests/Standup/StandupSettingsTests.cs`
- `backend/tests/ProjectManagement.Application.Tests/Standup/StandupSchedulerTests.cs`

**Modify (Backend):**
- `backend/src/ProjectManagement.Domain/Entities/ActivityLog.cs` — add `ProjectId` property
- `backend/src/ProjectManagement.Application/Interfaces/IActivityRepository.cs` — add `GetByProjectAndUserAsync`
- `backend/src/ProjectManagement.Infrastructure/Repositories/ActivityRepository.cs` — implement new method
- `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ActivityLogConfiguration.cs` — add index on ProjectId
- 10 handler files — add `projectId` to `ActivityLog.Create()` calls
- `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs` — add `StandupSettings` and `StandupReports` DbSets
- `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs` — register new repos, service, background service

**Create (Frontend):**
- `frontend/libs/shared/models/src/lib/standup.model.ts`
- `frontend/libs/projects/data-access/src/lib/updates.service.ts`
- `frontend/libs/projects/feature/src/lib/updates-tab/updates-tab.component.ts`

**Modify (Frontend):**
- `frontend/libs/shared/models/src/lib/index.ts` — export standup models
- `frontend/libs/projects/data-access/src/lib/index.ts` — export UpdatesService
- `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts` — add Updates tab

---

### Task 1: Add ProjectId to ActivityLog + update all call sites

**Files:**
- Modify: `backend/src/ProjectManagement.Domain/Entities/ActivityLog.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ActivityLogConfiguration.cs`
- Modify (10 files): all handlers that call `ActivityLog.Create()`

- [ ] **Step 1: Add `ProjectId` property to ActivityLog entity**

Replace the static factory method in `ActivityLog.cs`:

```csharp
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public string UserId { get; private set; } = string.Empty;
    public string UserName { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public Guid? EntityId { get; private set; }
    public string EntityName { get; private set; } = string.Empty;
    public Guid? ProjectId { get; private set; }

    private ActivityLog() { }

    public static ActivityLog Create(
        string userId,
        string userName,
        string action,
        string entityType,
        Guid? entityId,
        string entityName,
        Guid? projectId = null)
    {
        return new ActivityLog
        {
            UserId = userId,
            UserName = userName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            ProjectId = projectId,
        };
    }
}
```

- [ ] **Step 2: Add ProjectId index to ActivityLogConfiguration**

In `ActivityLogConfiguration.cs`, add after the existing `HasIndex`:

```csharp
builder.Property(a => a.ProjectId);
builder.HasIndex(a => new { a.ProjectId, a.UserId, a.CreatedAt });
```

- [ ] **Step 3: Update the 10 ActivityLog.Create() call sites**

Add `projectId: <value>` as a named argument to each call:

**`CreateTaskCommandHandler.cs`** — add `projectId: request.ProjectId`

**`CreateProjectCommandHandler.cs`** — add `projectId: project.Id`

**`ActivateSprintCommandHandler.cs`** — add `projectId: sprint.ProjectId`

**`CompleteSprintCommandHandler.cs`** — add `projectId: sprint.ProjectId`

**`CreateIssueCommandHandler.cs`** — add `projectId: request.ProjectId`

**`CloseIssueCommandHandler.cs`** — add `projectId: issue.ProjectId`

**`ConvertIssueToTaskCommandHandler.cs`** — add `projectId: task.ProjectId`

**`CreateProjectWithPlanCommandHandler.cs`** — add `projectId: project.Id`

**`AddPlanTasksCommandHandler.cs`** — add `projectId: req.ProjectId`

**`TaskStatusChangedEventHandler.cs`** — add `projectId: e.ProjectId` (the domain event should carry ProjectId; if it doesn't, look up the task's ProjectId in the handler)

The `projectId` parameter has a default of `null` so the code compiles before you finish all call sites.

- [ ] **Step 4: Build backend to confirm no compile errors**

```bash
cd backend
dotnet build src/ProjectManagement.Domain
dotnet build src/ProjectManagement.Application
dotnet build src/ProjectManagement.Infrastructure
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Entities/ActivityLog.cs
git add backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ActivityLogConfiguration.cs
git add -p  # stage the 10 handler changes individually or by file
git commit -m "feat: add ProjectId to ActivityLog for standup scoping"
```

---

### Task 2: StandupSettings domain entity + repository infrastructure

**Files:**
- Create: `backend/src/ProjectManagement.Domain/Entities/StandupSettings.cs`
- Create: `backend/src/ProjectManagement.Application/Interfaces/IStandupSettingsRepository.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupSettingsConfiguration.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/StandupSettingsRepository.cs`
- Create: `backend/tests/ProjectManagement.Application.Tests/Standup/StandupSettingsTests.cs`

- [ ] **Step 1: Write the failing domain tests**

Create `backend/tests/ProjectManagement.Application.Tests/Standup/StandupSettingsTests.cs`:

```csharp
using ProjectManagement.Domain.Entities;
using Xunit;

namespace ProjectManagement.Application.Tests.Standup;

public class StandupSettingsTests
{
    [Fact]
    public void Create_SetsDefaultValues()
    {
        var projectId = Guid.NewGuid();
        var settings = StandupSettings.Create(projectId);

        Assert.Equal(projectId, settings.ProjectId);
        Assert.False(settings.IsEnabled);
        Assert.Equal(new TimeOnly(8, 0), settings.ScheduledTime);
        Assert.Null(settings.LastRunAt);
    }

    [Fact]
    public void Update_ChangesEnabledAndTime()
    {
        var settings = StandupSettings.Create(Guid.NewGuid());
        var newTime = new TimeOnly(9, 30);

        settings.Update(isEnabled: true, scheduledTime: newTime);

        Assert.True(settings.IsEnabled);
        Assert.Equal(newTime, settings.ScheduledTime);
    }

    [Fact]
    public void MarkRun_SetsLastRunAt()
    {
        var settings = StandupSettings.Create(Guid.NewGuid());
        var before = DateTime.UtcNow;

        settings.MarkRun();

        Assert.NotNull(settings.LastRunAt);
        Assert.True(settings.LastRunAt >= before);
    }

    [Fact]
    public void MarkRun_UpdatesExistingLastRunAt()
    {
        var settings = StandupSettings.Create(Guid.NewGuid());
        settings.MarkRun();
        var firstRun = settings.LastRunAt!.Value;

        settings.MarkRun();

        Assert.True(settings.LastRunAt >= firstRun);
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend
dotnet test tests/ProjectManagement.Application.Tests --filter "StandupSettingsTests"
```

Expected: `StandupSettings` type not found — compilation error.

- [ ] **Step 3: Create StandupSettings entity**

Create `backend/src/ProjectManagement.Domain/Entities/StandupSettings.cs`:

```csharp
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class StandupSettings : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public bool IsEnabled { get; private set; }
    public TimeOnly ScheduledTime { get; private set; }
    public DateTime? LastRunAt { get; private set; }

    private StandupSettings() { }

    public static StandupSettings Create(Guid projectId) =>
        new() { ProjectId = projectId, IsEnabled = false, ScheduledTime = new TimeOnly(8, 0) };

    public void Update(bool isEnabled, TimeOnly scheduledTime)
    {
        IsEnabled = isEnabled;
        ScheduledTime = scheduledTime;
        SetUpdated();
    }

    public void MarkRun()
    {
        LastRunAt = DateTime.UtcNow;
        SetUpdated();
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
dotnet test tests/ProjectManagement.Application.Tests --filter "StandupSettingsTests"
```

Expected: 4 tests passed.

- [ ] **Step 5: Create IStandupSettingsRepository**

Create `backend/src/ProjectManagement.Application/Interfaces/IStandupSettingsRepository.cs`:

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IStandupSettingsRepository : IRepository<StandupSettings>
{
    Task<StandupSettings?> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<StandupSettings>> GetEnabledAsync(CancellationToken ct = default);
}
```

- [ ] **Step 6: Create StandupSettingsConfiguration**

Create `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupSettingsConfiguration.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class StandupSettingsConfiguration : IEntityTypeConfiguration<StandupSettings>
{
    public void Configure(EntityTypeBuilder<StandupSettings> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.ProjectId).IsRequired();
        builder.Property(s => s.ScheduledTime).HasColumnType("time").IsRequired();
        builder.HasIndex(s => s.ProjectId).IsUnique();
        builder.HasOne(s => s.Project)
            .WithMany()
            .HasForeignKey(s => s.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

- [ ] **Step 7: Create StandupSettingsRepository**

Create `backend/src/ProjectManagement.Infrastructure/Repositories/StandupSettingsRepository.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class StandupSettingsRepository(ApplicationDbContext db)
    : Repository<StandupSettings>(db), IStandupSettingsRepository
{
    public async Task<StandupSettings?> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await db.StandupSettings.FirstOrDefaultAsync(s => s.ProjectId == projectId, ct);

    public async Task<IReadOnlyList<StandupSettings>> GetEnabledAsync(CancellationToken ct = default)
        => await db.StandupSettings.Where(s => s.IsEnabled).ToListAsync(ct);
}
```

- [ ] **Step 8: Add DbSet to ApplicationDbContext**

In `ApplicationDbContext.cs`, add with the other DbSets:

```csharp
public DbSet<StandupSettings> StandupSettings => Set<StandupSettings>();
```

- [ ] **Step 9: Register in DependencyInjection**

In `DependencyInjection.cs`, add with the other scoped repos:

```csharp
services.AddScoped<IStandupSettingsRepository, StandupSettingsRepository>();
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Entities/StandupSettings.cs \
        backend/src/ProjectManagement.Application/Interfaces/IStandupSettingsRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupSettingsConfiguration.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/StandupSettingsRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs \
        backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs \
        backend/tests/ProjectManagement.Application.Tests/Standup/StandupSettingsTests.cs
git commit -m "feat: add StandupSettings entity and repository"
```

---

### Task 3: StandupReport domain entity + repository infrastructure

**Files:**
- Create: `backend/src/ProjectManagement.Domain/Entities/StandupReport.cs`
- Create: `backend/src/ProjectManagement.Application/Interfaces/IStandupReportRepository.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupReportConfiguration.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/StandupReportRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs`

- [ ] **Step 1: Create StandupReport entity**

Create `backend/src/ProjectManagement.Domain/Entities/StandupReport.cs`:

```csharp
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class StandupReport : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public DateTime GeneratedAt { get; private set; }
    public bool IsScheduled { get; private set; }
    public string? GeneratedById { get; private set; }
    public string ReportJson { get; private set; } = string.Empty;

    private StandupReport() { }

    public static StandupReport Create(
        Guid projectId, bool isScheduled, string? generatedById, string reportJson) =>
        new()
        {
            ProjectId = projectId,
            GeneratedAt = DateTime.UtcNow,
            IsScheduled = isScheduled,
            GeneratedById = generatedById,
            ReportJson = reportJson,
        };
}
```

- [ ] **Step 2: Create IStandupReportRepository**

Create `backend/src/ProjectManagement.Application/Interfaces/IStandupReportRepository.cs`:

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IStandupReportRepository : IRepository<StandupReport>
{
    Task<IReadOnlyList<StandupReport>> GetByProjectAsync(Guid projectId, int count, CancellationToken ct = default);
}
```

- [ ] **Step 3: Create StandupReportConfiguration**

Create `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupReportConfiguration.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class StandupReportConfiguration : IEntityTypeConfiguration<StandupReport>
{
    public void Configure(EntityTypeBuilder<StandupReport> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.ProjectId).IsRequired();
        builder.Property(r => r.ReportJson).IsRequired();
        builder.HasIndex(r => new { r.ProjectId, r.GeneratedAt });
        builder.HasOne(r => r.Project)
            .WithMany()
            .HasForeignKey(r => r.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

- [ ] **Step 4: Create StandupReportRepository**

Create `backend/src/ProjectManagement.Infrastructure/Repositories/StandupReportRepository.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class StandupReportRepository(ApplicationDbContext db)
    : Repository<StandupReport>(db), IStandupReportRepository
{
    public async Task<IReadOnlyList<StandupReport>> GetByProjectAsync(
        Guid projectId, int count, CancellationToken ct = default)
        => await db.StandupReports
            .Where(r => r.ProjectId == projectId)
            .OrderByDescending(r => r.GeneratedAt)
            .Take(count)
            .ToListAsync(ct);
}
```

- [ ] **Step 5: Add DbSet + register repo**

In `ApplicationDbContext.cs`:
```csharp
public DbSet<StandupReport> StandupReports => Set<StandupReport>();
```

In `DependencyInjection.cs`:
```csharp
services.AddScoped<IStandupReportRepository, StandupReportRepository>();
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Entities/StandupReport.cs \
        backend/src/ProjectManagement.Application/Interfaces/IStandupReportRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/StandupReportConfiguration.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/StandupReportRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs \
        backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs
git commit -m "feat: add StandupReport entity and repository"
```

---

### Task 4: EF Core migration

**Files:**
- Create (auto-generated): `backend/src/ProjectManagement.Infrastructure/Persistence/Migrations/..._AddStandupFeature.cs`

- [ ] **Step 1: Create the migration**

```bash
cd backend
dotnet ef migrations add AddStandupFeature \
  --project src/ProjectManagement.Infrastructure \
  --startup-project src/ProjectManagement.WebApi
```

Expected: New migration file created in `src/ProjectManagement.Infrastructure/Persistence/Migrations/`.

Verify the migration adds:
- `ActivityLogs.ProjectId` column (nullable Guid) and the composite index
- `StandupSettings` table with columns: Id, ProjectId (unique index), IsEnabled, ScheduledTime (time), LastRunAt, CreatedAt, UpdatedAt, IsDeleted, DeletedAt
- `StandupReports` table with columns: Id, ProjectId, GeneratedAt, IsScheduled, GeneratedById, ReportJson, CreatedAt, UpdatedAt, IsDeleted, DeletedAt

- [ ] **Step 2: Apply migration to database**

```bash
dotnet ef database update \
  --project src/ProjectManagement.Infrastructure \
  --startup-project src/ProjectManagement.WebApi
```

Expected: Database updated successfully.

- [ ] **Step 3: Build WebApi to confirm no errors**

```bash
dotnet build src/ProjectManagement.WebApi
```

Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Infrastructure/Persistence/Migrations/
git commit -m "feat: add migration for standup settings and reports"
```

---

### Task 5: Extend ActivityRepository + create ITimeLogRepository

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Interfaces/IActivityRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Repositories/ActivityRepository.cs`
- Create: `backend/src/ProjectManagement.Application/Interfaces/ITimeLogRepository.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/TimeLogRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs`

- [ ] **Step 1: Add `GetByProjectAndUserAsync` to IActivityRepository**

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IActivityRepository : IRepository<ActivityLog>
{
    Task<IReadOnlyList<ActivityLog>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ActivityLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateTime since, CancellationToken ct = default);
}
```

- [ ] **Step 2: Implement the new method in ActivityRepository**

In `ActivityRepository.cs`, add:

```csharp
public async Task<IReadOnlyList<ActivityLog>> GetByProjectAndUserAsync(
    Guid projectId, string userId, DateTime since, CancellationToken ct = default)
    => await _context.ActivityLogs
        .Where(a => a.ProjectId == projectId && a.UserId == userId && a.CreatedAt >= since)
        .OrderByDescending(a => a.CreatedAt)
        .ToListAsync(ct);
```

- [ ] **Step 3: Create ITimeLogRepository**

Create `backend/src/ProjectManagement.Application/Interfaces/ITimeLogRepository.cs`:

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ITimeLogRepository : IRepository<TimeLog>
{
    Task<IReadOnlyList<TimeLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateOnly date, CancellationToken ct = default);
}
```

- [ ] **Step 4: Create TimeLogRepository**

Create `backend/src/ProjectManagement.Infrastructure/Repositories/TimeLogRepository.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TimeLogRepository(ApplicationDbContext db)
    : Repository<TimeLog>(db), ITimeLogRepository
{
    public async Task<IReadOnlyList<TimeLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateOnly date, CancellationToken ct = default)
        => await db.TimeLogs
            .Include(t => t.Task)
            .Where(t => t.UserId == userId && t.LoggedDate == date && t.Task.ProjectId == projectId)
            .ToListAsync(ct);
}
```

- [ ] **Step 5: Register TimeLogRepository in DI**

In `DependencyInjection.cs`:
```csharp
services.AddScoped<ITimeLogRepository, TimeLogRepository>();
```

- [ ] **Step 6: Build Infrastructure to confirm no errors**

```bash
cd backend
dotnet build src/ProjectManagement.Infrastructure
```

Expected: Build succeeded.

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Application/Interfaces/IActivityRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/ActivityRepository.cs \
        backend/src/ProjectManagement.Application/Interfaces/ITimeLogRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/TimeLogRepository.cs \
        backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs
git commit -m "feat: extend ActivityRepository and add TimeLogRepository for standup queries"
```

---

### Task 6: StandupGeneratorService

**Files:**
- Create: `backend/src/ProjectManagement.Application/Interfaces/IStandupGeneratorService.cs`
- Create: `backend/src/ProjectManagement.Application/Services/StandupGeneratorService.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupMemberSummaryDto.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs`

- [ ] **Step 1: Create StandupMemberSummaryDto**

Create `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupMemberSummaryDto.cs`:

```csharp
namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupMemberSummaryDto(string UserId, string Name, string Summary);
```

- [ ] **Step 2: Create IStandupGeneratorService**

Create `backend/src/ProjectManagement.Application/Interfaces/IStandupGeneratorService.cs`:

```csharp
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Interfaces;

public interface IStandupGeneratorService
{
    Task<StandupReport> GenerateAsync(
        Guid projectId, bool isScheduled, string? generatedById, CancellationToken ct = default);
}
```

- [ ] **Step 3: Create StandupGeneratorService**

Create `backend/src/ProjectManagement.Application/Services/StandupGeneratorService.cs`:

```csharp
using System.Text.Json;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Services;

public class StandupGeneratorService(
    IProjectMemberRepository memberRepo,
    IActivityRepository activityRepo,
    ITimeLogRepository timeLogRepo,
    IStandupReportRepository reportRepo,
    IClaudeService claudeService,
    IUnitOfWork unitOfWork) : IStandupGeneratorService
{
    public async Task<StandupReport> GenerateAsync(
        Guid projectId, bool isScheduled, string? generatedById, CancellationToken ct = default)
    {
        var members = await memberRepo.GetByProjectAsync(projectId, ct);
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var since = now.AddHours(-24);

        var summaries = new List<StandupMemberSummaryDto>();
        foreach (var member in members)
        {
            var activity = await activityRepo.GetByProjectAndUserAsync(projectId, member.UserId, since, ct);
            var timeLogs = await timeLogRepo.GetByProjectAndUserAsync(projectId, member.UserId, today, ct);

            string summary;
            if (activity.Count == 0 && timeLogs.Count == 0)
            {
                summary = "No activity recorded.";
            }
            else
            {
                var prompt = BuildPrompt(member.FullName, activity, timeLogs);
                summary = await claudeService.AskAsync(prompt, ct);
            }

            summaries.Add(new StandupMemberSummaryDto(member.UserId, member.FullName, summary));
        }

        var reportJson = JsonSerializer.Serialize(summaries);
        var report = StandupReport.Create(projectId, isScheduled, generatedById, reportJson);
        await reportRepo.AddAsync(report, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return report;
    }

    private static string BuildPrompt(
        string name,
        IReadOnlyList<ActivityLog> activity,
        IReadOnlyList<TimeLog> timeLogs)
    {
        var actData = activity.Select(a => new { a.Action, a.EntityType, a.EntityName });
        var timeData = timeLogs.Select(t => new { TaskName = t.Task?.Title ?? "Unknown task", t.Hours, t.Description });

        return $"""
            Write a concise standup update for {name} based on the following activity from the last 24 hours.

            Format your response exactly as:
            ✅ Yesterday: [what they completed or worked on]
            🔄 Today: [tasks currently In Progress or To Do]
            ⚠️ Blocked: [any task or issue in Blocked status — omit this line if none]

            Be brief. Use the task/issue names from the data. Do not invent information.

            Activity:
            {JsonSerializer.Serialize(actData)}

            Time logged:
            {JsonSerializer.Serialize(timeData)}
            """;
    }
}
```

Note: `t.Task` is a navigation property on `TimeLog`. The `TimeLogRepository.GetByProjectAndUserAsync` uses `.Include(t => t.Task)` to load it, so `t.Task.Title` is available.

- [ ] **Step 4: Register StandupGeneratorService in DI**

In `DependencyInjection.cs`:
```csharp
services.AddScoped<IStandupGeneratorService, StandupGeneratorService>();
```

- [ ] **Step 5: Build Application + Infrastructure**

```bash
cd backend
dotnet build src/ProjectManagement.Application
dotnet build src/ProjectManagement.Infrastructure
```

Expected: Build succeeded.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupMemberSummaryDto.cs \
        backend/src/ProjectManagement.Application/Interfaces/IStandupGeneratorService.cs \
        backend/src/ProjectManagement.Application/Services/StandupGeneratorService.cs \
        backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs
git commit -m "feat: add StandupGeneratorService with Claude-backed summary generation"
```

---

### Task 7: CQRS — GetStandupSettings + UpdateStandupSettings

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupSettingsDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GetStandupSettings/GetStandupSettingsQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GetStandupSettings/GetStandupSettingsQueryHandler.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/UpdateStandupSettings/UpdateStandupSettingsCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/UpdateStandupSettings/UpdateStandupSettingsCommandHandler.cs`

- [ ] **Step 1: Create StandupSettingsDto**

Create `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupSettingsDto.cs`:

```csharp
namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupSettingsDto(Guid ProjectId, bool IsEnabled, string ScheduledTime);
```

`ScheduledTime` is a string in `"HH:mm"` format for easy JSON transport.

- [ ] **Step 2: Create GetStandupSettingsQuery**

Create `backend/src/ProjectManagement.Application/Features/Standup/GetStandupSettings/GetStandupSettingsQuery.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GetStandupSettings;

public sealed record GetStandupSettingsQuery(Guid ProjectId) : IQuery<StandupSettingsDto>;
```

- [ ] **Step 3: Create GetStandupSettingsQueryHandler**

Create `backend/src/ProjectManagement.Application/Features/Standup/GetStandupSettings/GetStandupSettingsQueryHandler.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GetStandupSettings;

internal sealed class GetStandupSettingsQueryHandler(
    IStandupSettingsRepository settingsRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GetStandupSettingsQuery, Result<StandupSettingsDto>>
{
    public async Task<Result<StandupSettingsDto>> Handle(GetStandupSettingsQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Standup.Forbidden", "You do not have access to this project.");

        var settings = await settingsRepo.GetByProjectAsync(request.ProjectId, ct);
        if (settings == null)
            return new StandupSettingsDto(request.ProjectId, false, "08:00");

        return new StandupSettingsDto(settings.ProjectId, settings.IsEnabled, settings.ScheduledTime.ToString("HH:mm"));
    }
}
```

- [ ] **Step 4: Create UpdateStandupSettingsCommand**

Create `backend/src/ProjectManagement.Application/Features/Standup/UpdateStandupSettings/UpdateStandupSettingsCommand.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.UpdateStandupSettings;

public sealed record UpdateStandupSettingsCommand(
    Guid ProjectId,
    bool IsEnabled,
    string ScheduledTime) : ICommand<StandupSettingsDto>;
```

- [ ] **Step 5: Create UpdateStandupSettingsCommandHandler**

Create `backend/src/ProjectManagement.Application/Features/Standup/UpdateStandupSettings/UpdateStandupSettingsCommandHandler.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Standup.UpdateStandupSettings;

internal sealed class UpdateStandupSettingsCommandHandler(
    IStandupSettingsRepository settingsRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateStandupSettingsCommand, Result<StandupSettingsDto>>
{
    public async Task<Result<StandupSettingsDto>> Handle(UpdateStandupSettingsCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Standup.Forbidden", "Only project managers can configure standup settings.");

        if (!TimeOnly.TryParse(request.ScheduledTime, out var scheduledTime))
            return Error.Validation("Standup.InvalidTime", "ScheduledTime must be in HH:mm format.");

        var settings = await settingsRepo.GetByProjectAsync(request.ProjectId, ct);
        if (settings == null)
        {
            settings = StandupSettings.Create(request.ProjectId);
            await settingsRepo.AddAsync(settings, ct);
        }

        settings.Update(request.IsEnabled, scheduledTime);
        await unitOfWork.SaveChangesAsync(ct);

        return new StandupSettingsDto(settings.ProjectId, settings.IsEnabled, settings.ScheduledTime.ToString("HH:mm"));
    }
}
```

- [ ] **Step 6: Build Application**

```bash
cd backend && dotnet build src/ProjectManagement.Application
```

Expected: Build succeeded.

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Standup/
git commit -m "feat: add GetStandupSettings and UpdateStandupSettings CQRS handlers"
```

---

### Task 8: CQRS — GenerateStandup + GetStandupReports + GetStandupReport

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupReportDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupReportSummaryDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GenerateStandup/GenerateStandupCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GenerateStandup/GenerateStandupCommandHandler.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReports/GetStandupReportsQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReports/GetStandupReportsQueryHandler.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReport/GetStandupReportQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Standup/GetStandupReport/GetStandupReportQueryHandler.cs`

- [ ] **Step 1: Create StandupReportDto and StandupReportSummaryDto**

`backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupReportDto.cs`:

```csharp
namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupReportDto(
    Guid Id,
    Guid ProjectId,
    DateTime GeneratedAt,
    bool IsScheduled,
    string? GeneratedById,
    List<StandupMemberSummaryDto> Members);
```

`backend/src/ProjectManagement.Application/Features/Standup/DTOs/StandupReportSummaryDto.cs`:

```csharp
namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupReportSummaryDto(Guid Id, DateTime GeneratedAt, bool IsScheduled);
```

- [ ] **Step 2: Create GenerateStandupCommand**

`backend/src/ProjectManagement.Application/Features/Standup/GenerateStandup/GenerateStandupCommand.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GenerateStandup;

public sealed record GenerateStandupCommand(Guid ProjectId) : ICommand<StandupReportDto>;
```

- [ ] **Step 3: Create GenerateStandupCommandHandler**

`backend/src/ProjectManagement.Application/Features/Standup/GenerateStandup/GenerateStandupCommandHandler.cs`:

```csharp
using System.Text.Json;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GenerateStandup;

internal sealed class GenerateStandupCommandHandler(
    IStandupGeneratorService generator,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GenerateStandupCommand, Result<StandupReportDto>>
{
    public async Task<Result<StandupReportDto>> Handle(GenerateStandupCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Standup.Forbidden", "Only project managers can generate standup reports.");

        var report = await generator.GenerateAsync(request.ProjectId, isScheduled: false, currentUser.UserId, ct);
        var members = JsonSerializer.Deserialize<List<StandupMemberSummaryDto>>(report.ReportJson) ?? [];

        return new StandupReportDto(report.Id, report.ProjectId, report.GeneratedAt, report.IsScheduled, report.GeneratedById, members);
    }
}
```

- [ ] **Step 4: Create GetStandupReportsQuery + handler**

`backend/src/ProjectManagement.Application/Features/Standup/GetStandupReports/GetStandupReportsQuery.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GetStandupReports;

public sealed record GetStandupReportsQuery(Guid ProjectId) : IQuery<List<StandupReportSummaryDto>>;
```

`backend/src/ProjectManagement.Application/Features/Standup/GetStandupReports/GetStandupReportsQueryHandler.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GetStandupReports;

internal sealed class GetStandupReportsQueryHandler(
    IStandupReportRepository reportRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GetStandupReportsQuery, Result<List<StandupReportSummaryDto>>>
{
    public async Task<Result<List<StandupReportSummaryDto>>> Handle(GetStandupReportsQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Standup.Forbidden", "You do not have access to this project.");

        var reports = await reportRepo.GetByProjectAsync(request.ProjectId, count: 30, ct);
        return reports.Select(r => new StandupReportSummaryDto(r.Id, r.GeneratedAt, r.IsScheduled)).ToList();
    }
}
```

- [ ] **Step 5: Create GetStandupReportQuery + handler**

`backend/src/ProjectManagement.Application/Features/Standup/GetStandupReport/GetStandupReportQuery.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GetStandupReport;

public sealed record GetStandupReportQuery(Guid ProjectId, Guid ReportId) : IQuery<StandupReportDto>;
```

`backend/src/ProjectManagement.Application/Features/Standup/GetStandupReport/GetStandupReportQueryHandler.cs`:

```csharp
using System.Text.Json;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GetStandupReport;

internal sealed class GetStandupReportQueryHandler(
    IStandupReportRepository reportRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GetStandupReportQuery, Result<StandupReportDto>>
{
    public async Task<Result<StandupReportDto>> Handle(GetStandupReportQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Standup.Forbidden", "You do not have access to this project.");

        var report = await reportRepo.GetByIdAsync(request.ReportId, ct);
        if (report == null || report.ProjectId != request.ProjectId)
            return Error.NotFound("Standup.ReportNotFound", "Report not found.");

        var members = JsonSerializer.Deserialize<List<StandupMemberSummaryDto>>(report.ReportJson) ?? [];
        return new StandupReportDto(report.Id, report.ProjectId, report.GeneratedAt, report.IsScheduled, report.GeneratedById, members);
    }
}
```

- [ ] **Step 6: Build Application**

```bash
cd backend && dotnet build src/ProjectManagement.Application
```

Expected: Build succeeded.

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Standup/
git commit -m "feat: add GenerateStandup, GetStandupReports, GetStandupReport CQRS handlers"
```

---

### Task 9: StandupController

**Files:**
- Create: `backend/src/ProjectManagement.WebApi/Controllers/StandupController.cs`

- [ ] **Step 1: Create StandupController**

Create `backend/src/ProjectManagement.WebApi/Controllers/StandupController.cs`:

```csharp
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Standup.GenerateStandup;
using ProjectManagement.Application.Features.Standup.GetStandupReport;
using ProjectManagement.Application.Features.Standup.GetStandupReports;
using ProjectManagement.Application.Features.Standup.GetStandupSettings;
using ProjectManagement.Application.Features.Standup.UpdateStandupSettings;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/standup")]
[Authorize]
public class StandupController(ISender sender) : ControllerBase
{
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings([FromRoute] Guid projectId, CancellationToken ct)
    {
        var result = await sender.Send(new GetStandupSettingsQuery(projectId), ct);
        return result.IsSuccess ? Ok(result.Value) : Forbid();
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromRoute] Guid projectId,
        [FromBody] UpdateStandupSettingsRequest request,
        CancellationToken ct)
    {
        var result = await sender.Send(
            new UpdateStandupSettingsCommand(projectId, request.IsEnabled, request.ScheduledTime), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error.Code.Contains("Forbidden")
            ? Forbid() : BadRequest(result.Error.Message);
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromRoute] Guid projectId, CancellationToken ct)
    {
        var result = await sender.Send(new GenerateStandupCommand(projectId), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error.Code.Contains("Forbidden")
            ? Forbid() : BadRequest(result.Error.Message);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromRoute] Guid projectId, CancellationToken ct)
    {
        var result = await sender.Send(new GetStandupReportsQuery(projectId), ct);
        return result.IsSuccess ? Ok(result.Value) : Forbid();
    }

    [HttpGet("reports/{reportId:guid}")]
    public async Task<IActionResult> GetReport(
        [FromRoute] Guid projectId,
        [FromRoute] Guid reportId,
        CancellationToken ct)
    {
        var result = await sender.Send(new GetStandupReportQuery(projectId, reportId), ct);
        return result.IsSuccess ? Ok(result.Value) : NotFound();
    }
}

public record UpdateStandupSettingsRequest(bool IsEnabled, string ScheduledTime);
```

- [ ] **Step 2: Build WebApi**

```bash
cd backend && dotnet build src/ProjectManagement.WebApi
```

Expected: Build succeeded.

- [ ] **Step 3: Smoke test the GET settings endpoint**

Start the API (`dotnet run --project src/ProjectManagement.WebApi`) and call:

```bash
curl -s -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/projects/<projectId>/standup/settings
```

Expected: `{"projectId":"...","isEnabled":false,"scheduledTime":"08:00"}`

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.WebApi/Controllers/StandupController.cs
git commit -m "feat: add StandupController with 5 endpoints"
```

---

### Task 10: StandupSchedulerService

**Files:**
- Create: `backend/src/ProjectManagement.Infrastructure/BackgroundServices/StandupSchedulerService.cs`
- Create: `backend/tests/ProjectManagement.Application.Tests/Standup/StandupSchedulerTests.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs`

- [ ] **Step 1: Write scheduler logic tests**

Create `backend/tests/ProjectManagement.Application.Tests/Standup/StandupSchedulerTests.cs`:

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.BackgroundServices;
using Xunit;

namespace ProjectManagement.Application.Tests.Standup;

public class StandupSchedulerTests
{
    private static StandupSettings EnabledAt(TimeOnly time)
    {
        var s = StandupSettings.Create(Guid.NewGuid());
        s.Update(isEnabled: true, scheduledTime: time);
        return s;
    }

    [Fact]
    public void ShouldRun_WhenEnabledAndTimeMatchesAndNotRunToday_ReturnsTrue()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), today);

        Assert.True(result);
    }

    [Fact]
    public void ShouldRun_WhenDisabled_ReturnsFalse()
    {
        var settings = StandupSettings.Create(Guid.NewGuid()); // IsEnabled = false
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), today);

        Assert.False(result);
    }

    [Fact]
    public void ShouldRun_WhenAlreadyRanToday_ReturnsFalse()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        settings.MarkRun();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), today);

        Assert.False(result);
    }

    [Fact]
    public void ShouldRun_WhenTimeDiffMoreThanOneMinute_ReturnsFalse()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 2), today);

        Assert.False(result);
    }

    [Fact]
    public void ShouldRun_WhenRanYesterday_ReturnsTrue()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        settings.MarkRun();
        // Simulate LastRunAt being yesterday by checking with tomorrow's date
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), tomorrow);

        Assert.True(result);
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend
dotnet test tests/ProjectManagement.Application.Tests --filter "StandupSchedulerTests"
```

Expected: `StandupSchedulerService` type not found.

- [ ] **Step 3: Create StandupSchedulerService**

Create `backend/src/ProjectManagement.Infrastructure/BackgroundServices/StandupSchedulerService.cs`:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Infrastructure.BackgroundServices;

public class StandupSchedulerService(
    IServiceScopeFactory scopeFactory,
    ILogger<StandupSchedulerService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(1), ct);
            try { await RunScheduledStandupsAsync(ct); }
            catch (Exception ex) { logger.LogError(ex, "Standup scheduler error"); }
        }
    }

    private async Task RunScheduledStandupsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var settingsRepo = scope.ServiceProvider.GetRequiredService<IStandupSettingsRepository>();
        var generator = scope.ServiceProvider.GetRequiredService<IStandupGeneratorService>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var now = DateTime.UtcNow;
        var currentTime = TimeOnly.FromDateTime(now);
        var today = DateOnly.FromDateTime(now);

        var allEnabled = await settingsRepo.GetEnabledAsync(ct);
        foreach (var settings in allEnabled)
        {
            if (!ShouldRun(settings, currentTime, today)) continue;
            try
            {
                await generator.GenerateAsync(settings.ProjectId, isScheduled: true, generatedById: null, ct);
                settings.MarkRun();
                await unitOfWork.SaveChangesAsync(ct);
                logger.LogInformation("Standup generated for project {ProjectId}", settings.ProjectId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to generate standup for project {ProjectId}", settings.ProjectId);
            }
        }
    }

    internal static bool ShouldRun(StandupSettings settings, TimeOnly currentTime, DateOnly today)
    {
        if (!settings.IsEnabled) return false;
        var minuteDiff = Math.Abs((settings.ScheduledTime - currentTime).TotalMinutes);
        if (minuteDiff >= 1) return false;
        if (settings.LastRunAt == null) return true;
        return DateOnly.FromDateTime(settings.LastRunAt.Value) < today;
    }
}
```

- [ ] **Step 4: Register in DI**

In `DependencyInjection.cs`:
```csharp
services.AddHostedService<StandupSchedulerService>();
```

- [ ] **Step 5: Run tests — expect pass**

```bash
dotnet test tests/ProjectManagement.Application.Tests --filter "StandupSchedulerTests"
```

Expected: 5 tests passed.

- [ ] **Step 6: Build everything**

```bash
cd backend
dotnet build
dotnet test tests/ProjectManagement.Application.Tests
```

Expected: Build succeeded. All tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Infrastructure/BackgroundServices/StandupSchedulerService.cs \
        backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs \
        backend/tests/ProjectManagement.Application.Tests/Standup/StandupSchedulerTests.cs
git commit -m "feat: add StandupSchedulerService background service"
```

---

### Task 11: Frontend models + UpdatesService

**Files:**
- Create: `frontend/libs/shared/models/src/lib/standup.model.ts`
- Modify: `frontend/libs/shared/models/src/lib/index.ts`
- Create: `frontend/libs/projects/data-access/src/lib/updates.service.ts`
- Modify: `frontend/libs/projects/data-access/src/lib/index.ts`

- [ ] **Step 1: Create standup models**

Create `frontend/libs/shared/models/src/lib/standup.model.ts`:

```typescript
export interface StandupSettings {
  projectId: string;
  isEnabled: boolean;
  scheduledTime: string; // "HH:mm"
}

export interface UpdateStandupSettingsRequest {
  isEnabled: boolean;
  scheduledTime: string;
}

export interface StandupMemberSummary {
  userId: string;
  name: string;
  summary: string;
}

export interface StandupReport {
  id: string;
  projectId: string;
  generatedAt: string;
  isScheduled: boolean;
  generatedById?: string;
  members: StandupMemberSummary[];
}

export interface StandupReportSummary {
  id: string;
  generatedAt: string;
  isScheduled: boolean;
}
```

- [ ] **Step 2: Export from shared models index**

In `frontend/libs/shared/models/src/lib/index.ts`, add:

```typescript
export * from './standup.model';
```

- [ ] **Step 3: Create UpdatesService**

Create `frontend/libs/projects/data-access/src/lib/updates.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';
import {
  StandupSettings, UpdateStandupSettingsRequest,
  StandupReport, StandupReportSummary,
} from '@pm/shared/models';

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private http = inject(HttpClient);

  getSettings(projectId: string) {
    return this.http.get<StandupSettings>(
      `${environment.apiUrl}/projects/${projectId}/standup/settings`);
  }

  updateSettings(projectId: string, request: UpdateStandupSettingsRequest) {
    return this.http.put<StandupSettings>(
      `${environment.apiUrl}/projects/${projectId}/standup/settings`, request);
  }

  generate(projectId: string) {
    return this.http.post<StandupReport>(
      `${environment.apiUrl}/projects/${projectId}/standup/generate`, {});
  }

  getReports(projectId: string) {
    return this.http.get<StandupReportSummary[]>(
      `${environment.apiUrl}/projects/${projectId}/standup/reports`);
  }

  getReport(projectId: string, reportId: string) {
    return this.http.get<StandupReport>(
      `${environment.apiUrl}/projects/${projectId}/standup/reports/${reportId}`);
  }
}
```

- [ ] **Step 4: Export from projects data-access index**

In `frontend/libs/projects/data-access/src/lib/index.ts`, add:

```typescript
export * from './updates.service';
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend
node node_modules/typescript/bin/tsc --noEmit --project tsconfig.base.json
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/libs/shared/models/src/lib/standup.model.ts \
        frontend/libs/shared/models/src/lib/index.ts \
        frontend/libs/projects/data-access/src/lib/updates.service.ts \
        frontend/libs/projects/data-access/src/lib/index.ts
git commit -m "feat: add standup models and UpdatesService"
```

---

### Task 12: UpdatesTabComponent + wire up project-detail

**Files:**
- Create: `frontend/libs/projects/feature/src/lib/updates-tab/updates-tab.component.ts`
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

- [ ] **Step 1: Create UpdatesTabComponent**

Create `frontend/libs/projects/feature/src/lib/updates-tab/updates-tab.component.ts`:

```typescript
import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UpdatesService } from '@pm/projects/data-access';
import {
  StandupSettings, StandupReport, StandupReportSummary, StandupMemberSummary,
} from '@pm/shared/models';

@Component({
  selector: 'pm-updates-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="updates-toolbar">
      <div class="schedule-wrap">
        <label class="toggle-label">
          <span class="toggle-text">Schedule</span>
          <input type="checkbox" class="toggle-input" [checked]="isEnabled()"
                 (change)="toggleEnabled($event)" />
          <span class="toggle-pill" [class.on]="isEnabled()">
            {{ isEnabled() ? 'ON' : 'OFF' }}
          </span>
        </label>
        <input *ngIf="isEnabled()" type="time" class="time-input"
               [ngModel]="scheduledTime()" (ngModelChange)="onTimeChange($event)" />
      </div>
      <button class="btn-primary btn-sm" (click)="generate()" [disabled]="generating()">
        <span class="material-icons-round" style="font-size:14px">
          {{ generating() ? 'hourglass_empty' : 'play_arrow' }}
        </span>
        {{ generating() ? 'Generating…' : 'Generate Now' }}
      </button>
    </div>

    <div class="updates-body">
      <!-- Loading -->
      <div *ngIf="loading()" class="empty-state">
        <span class="material-icons-round spin">sync</span>
        <p>Loading…</p>
      </div>

      <!-- No reports yet -->
      <div *ngIf="!loading() && !latestReport() && !generating()" class="empty-state">
        <span class="material-icons-round" style="font-size:40px; color:var(--soft)">update</span>
        <p class="empty-title">No updates generated yet</p>
        <p class="empty-sub">Click Generate to create the first standup summary.</p>
      </div>

      <!-- Latest report -->
      <div *ngIf="latestReport()" class="report-section">
        <div class="report-meta">
          <span class="report-date">Latest · {{ latestReport()!.generatedAt | date:'MMM d, y · h:mm a' }}</span>
          <span class="report-badge" [class.scheduled]="latestReport()!.isScheduled">
            {{ latestReport()!.isScheduled ? 'Scheduled' : 'Manual' }}
          </span>
        </div>
        <div class="member-grid">
          <div *ngFor="let member of latestReport()!.members" class="member-card"
               [class.no-activity]="member.summary === 'No activity recorded.'">
            <div class="member-name">
              <div class="member-avatar">{{ initials(member.name) }}</div>
              {{ member.name }}
            </div>
            <pre class="member-summary">{{ member.summary }}</pre>
          </div>
        </div>
      </div>

      <!-- History -->
      <div *ngIf="history().length > 0" class="history-section">
        <div class="history-label">History</div>
        <div *ngFor="let item of history()" class="history-row" (click)="toggleHistory(item.id)">
          <span class="history-date">{{ item.generatedAt | date:'MMM d, y' }}</span>
          <span class="history-badge" [class.scheduled]="item.isScheduled">
            {{ item.isScheduled ? 'Scheduled' : 'Manual' }}
          </span>
          <span class="material-icons-round history-chevron"
                [class.open]="expandedId() === item.id">chevron_right</span>
        </div>
        <div *ngIf="expandedReport()" class="history-expanded">
          <div class="member-grid">
            <div *ngFor="let member of expandedReport()!.members" class="member-card"
                 [class.no-activity]="member.summary === 'No activity recorded.'">
              <div class="member-name">
                <div class="member-avatar">{{ initials(member.name) }}</div>
                {{ member.name }}
              </div>
              <pre class="member-summary">{{ member.summary }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .updates-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; border-bottom: 1px solid var(--border);
      background: var(--white); flex-shrink: 0;
    }
    .schedule-wrap { display: flex; align-items: center; gap: 12px; }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--ink-4); }
    .toggle-input { display: none; }
    .toggle-pill {
      padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
      transition: background 0.15s;
    }
    .toggle-pill.on { background: var(--violet); color: #fff; border-color: var(--violet); }
    .time-input {
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 4px 8px; font-size: 13px; background: var(--surface); color: var(--ink);
    }

    .updates-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 24px; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; color: var(--muted); padding: 48px; }
    .empty-title { font-size: 15px; font-weight: 600; color: var(--ink-4); margin: 0; }
    .empty-sub { font-size: 13px; margin: 0; }
    .spin { animation: spin 1.2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .report-section { display: flex; flex-direction: column; gap: 12px; }
    .report-meta { display: flex; align-items: center; gap: 10px; }
    .report-date { font-size: 13px; font-weight: 600; color: var(--ink); }
    .report-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
    }
    .report-badge.scheduled { background: var(--violet-mid); color: var(--violet); border-color: var(--violet); }

    .member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .member-card {
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg);
      padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
    }
    .member-card.no-activity { opacity: 0.55; }
    .member-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
    .member-avatar {
      width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center; font-size: 10px;
      color: #fff; font-weight: 700; flex-shrink: 0;
    }
    .member-summary { font-size: 12px; line-height: 1.6; color: var(--ink-4); white-space: pre-wrap; margin: 0; font-family: inherit; }

    .history-section { display: flex; flex-direction: column; gap: 4px; }
    .history-label { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px; }
    .history-row {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px;
      border: 1px solid var(--border); border-radius: var(--r-md); cursor: pointer;
      background: var(--white);
    }
    .history-row:hover { background: var(--surface); }
    .history-date { font-size: 13px; color: var(--ink); flex: 1; }
    .history-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
    }
    .history-badge.scheduled { background: var(--violet-mid); color: var(--violet); border-color: var(--violet); }
    .history-chevron { font-size: 18px; color: var(--muted); transition: transform 0.15s; }
    .history-chevron.open { transform: rotate(90deg); }
    .history-expanded { padding: 12px 0; }

    .btn-sm { padding: 6px 14px; border-radius: var(--r-md); font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; border: none; }
    .btn-primary { background: var(--violet); color: #fff; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class UpdatesTabComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private updatesService = inject(UpdatesService);

  loading = signal(true);
  generating = signal(false);
  isEnabled = signal(false);
  scheduledTime = signal('08:00');
  latestReport = signal<StandupReport | null>(null);
  history = signal<StandupReportSummary[]>([]);
  expandedId = signal<string | null>(null);
  expandedReport = signal<StandupReport | null>(null);

  ngOnInit(): void {
    this.loadSettings();
    this.loadReports();
  }

  private loadSettings(): void {
    this.updatesService.getSettings(this.projectId).subscribe(s => {
      this.isEnabled.set(s.isEnabled);
      this.scheduledTime.set(s.scheduledTime);
    });
  }

  private loadReports(): void {
    this.loading.set(true);
    this.updatesService.getReports(this.projectId).subscribe({
      next: reports => {
        this.history.set(reports.slice(1));
        if (reports.length > 0) {
          this.updatesService.getReport(this.projectId, reports[0].id).subscribe(r => {
            this.latestReport.set(r);
            this.loading.set(false);
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  toggleEnabled(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.isEnabled.set(enabled);
    this.updatesService.updateSettings(this.projectId, {
      isEnabled: enabled, scheduledTime: this.scheduledTime(),
    }).subscribe();
  }

  onTimeChange(time: string): void {
    this.scheduledTime.set(time);
    this.updatesService.updateSettings(this.projectId, {
      isEnabled: this.isEnabled(), scheduledTime: time,
    }).subscribe();
  }

  generate(): void {
    this.generating.set(true);
    this.updatesService.generate(this.projectId).subscribe({
      next: report => {
        this.latestReport.set(report);
        this.history.update(h => [{ id: report.id, generatedAt: report.generatedAt, isScheduled: report.isScheduled }, ...h].slice(0, 29));
        this.generating.set(false);
      },
      error: () => this.generating.set(false),
    });
  }

  toggleHistory(id: string): void {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.expandedReport.set(null);
      return;
    }
    this.expandedId.set(id);
    this.updatesService.getReport(this.projectId, id).subscribe(r => this.expandedReport.set(r));
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
```

- [ ] **Step 2: Add Updates tab to project-detail**

In `project-detail.component.ts`:

a) Add `'updates'` to the tab union type (wherever `activeTab` is declared as a string literal type).

b) Import `UpdatesTabComponent`:
```typescript
import { UpdatesTabComponent } from '../updates-tab/updates-tab.component';
```
Add `UpdatesTabComponent` to the `imports` array in `@Component`.

c) Add the tab button in the template (with the other tab buttons):
```html
<button class="tab" [class.active]="activeTab === 'updates'"
        (click)="activeTab = 'updates'">
  <span class="material-icons-round">update</span> Updates
</button>
```

d) Add the tab content panel (with the other tab content blocks):
```html
<pm-updates-tab
  *ngIf="activeTab === 'updates'"
  [projectId]="project.id" />
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
node node_modules/typescript/bin/tsc --noEmit --project tsconfig.base.json
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/updates-tab/updates-tab.component.ts \
        frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: add UpdatesTabComponent and wire up Updates tab in project detail"
```

---

## Done

All 12 tasks complete. The Updates tab is live on the project detail page with:
- Claude-generated per-member standup cards from ActivityLog + TimeLog data
- Manual generate button + configurable scheduled background generation
- History list with inline expand for past reports
- Schedule toggle + time picker persisted to `StandupSettings`
