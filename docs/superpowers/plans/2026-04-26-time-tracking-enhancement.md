# Time Tracking Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend time tracking to support subtask-level logging (rolling up to parent task totals), subtask estimated hours, and editing existing time log entries — aligned with Jira's time tracking model.

**Architecture:** Minimal patch approach — add `SubTaskId?` to the existing `TimeLog` entity and `EstimatedHours?` to `SubTask`. New `UpdateTimeLog` and `UpdateSubTask` features follow the existing MediatR CQRS command/handler pattern used throughout. Frontend changes are localized to `project-detail.component.ts` and `task.service.ts`.

**Tech Stack:** .NET 9 · Entity Framework Core · MediatR · xUnit · Angular 20 · Angular Signals · HttpClient

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/src/ProjectManagement.Domain/Entities/TimeLog.cs` |
| Modify | `backend/src/ProjectManagement.Domain/Entities/SubTask.cs` |
| Modify | `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/TimeLogDto.cs` |
| Modify | `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/SubTaskDto.cs` |
| Modify | `backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs` |
| Modify | `backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs` |
| Modify | `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/LogTimeCommand.cs` |
| Modify | `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/LogTimeCommandHandler.cs` |
| Create | `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/UpdateTimeLogCommand.cs` |
| Create | `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/UpdateTimeLogCommandHandler.cs` |
| Create | `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/UpdateSubTaskCommand.cs` |
| Create | `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/UpdateSubTaskCommandHandler.cs` |
| Modify | `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs` |
| Create | EF migration (generated) |
| Modify | `frontend/libs/shared/models/src/lib/task.model.ts` |
| Modify | `frontend/libs/tasks/data-access/src/lib/task.service.ts` |
| Modify | `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts` |
| Test   | `backend/tests/ProjectManagement.Application.Tests/TimeTracking/` |

---

## Task 1: Domain entity changes — TimeLog and SubTask

**Files:**
- Modify: `backend/src/ProjectManagement.Domain/Entities/TimeLog.cs`
- Modify: `backend/src/ProjectManagement.Domain/Entities/SubTask.cs`
- Create: `backend/tests/ProjectManagement.Application.Tests/TimeTracking/TimeLogTests.cs`
- Create: `backend/tests/ProjectManagement.Application.Tests/TimeTracking/SubTaskTests.cs`

- [ ] **Step 1: Write failing tests for TimeLog.Update() and SubTask.SetEstimatedHours()**

Create `backend/tests/ProjectManagement.Application.Tests/TimeTracking/TimeLogTests.cs`:

```csharp
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Tests.TimeTracking;

public class TimeLogTests
{
    [Fact]
    public void Update_ChangesHoursDescriptionAndDate()
    {
        var log = TimeLog.Create(Guid.NewGuid(), "user1", 2m, DateOnly.FromDateTime(DateTime.Today));

        log.Update(5m, "updated desc", DateOnly.FromDateTime(DateTime.Today.AddDays(-1)));

        Assert.Equal(5m, log.Hours);
        Assert.Equal("updated desc", log.Description);
        Assert.Equal(DateOnly.FromDateTime(DateTime.Today.AddDays(-1)), log.LoggedDate);
    }

    [Fact]
    public void Create_WithSubTaskId_SetsSubTaskId()
    {
        var subTaskId = Guid.NewGuid();
        var log = TimeLog.Create(Guid.NewGuid(), "user1", 2m, DateOnly.FromDateTime(DateTime.Today), subTaskId: subTaskId);

        Assert.Equal(subTaskId, log.SubTaskId);
    }

    [Fact]
    public void Create_WithoutSubTaskId_SubTaskIdIsNull()
    {
        var log = TimeLog.Create(Guid.NewGuid(), "user1", 2m, DateOnly.FromDateTime(DateTime.Today));

        Assert.Null(log.SubTaskId);
    }
}
```

Create `backend/tests/ProjectManagement.Application.Tests/TimeTracking/SubTaskTests.cs`:

```csharp
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Tests.TimeTracking;

public class SubTaskTests
{
    [Fact]
    public void SetEstimatedHours_SetsValue()
    {
        var st = SubTask.Create(Guid.NewGuid(), "Fix login");

        st.SetEstimatedHours(3.5m);

        Assert.Equal(3.5m, st.EstimatedHours);
    }

    [Fact]
    public void SetEstimatedHours_AcceptsNull()
    {
        var st = SubTask.Create(Guid.NewGuid(), "Fix login");
        st.SetEstimatedHours(3m);

        st.SetEstimatedHours(null);

        Assert.Null(st.EstimatedHours);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --filter "FullyQualifiedName~TimeTracking" -v minimal
```

Expected: compile error — `TimeLog.Update`, `TimeLog.SubTaskId`, `SubTask.SetEstimatedHours`, `SubTask.EstimatedHours` do not exist.

- [ ] **Step 3: Implement TimeLog entity changes**

Replace `backend/src/ProjectManagement.Domain/Entities/TimeLog.cs` with:

```csharp
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class TimeLog : BaseEntity
{
    public Guid TaskId { get; private set; }
    public Guid? SubTaskId { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public decimal Hours { get; private set; }
    public string? Description { get; private set; }
    public DateOnly LoggedDate { get; private set; }

    public ProjectTask Task { get; set; } = null!;
    public SubTask? SubTask { get; set; }

    private TimeLog() { }

    public static TimeLog Create(Guid taskId, string userId, decimal hours, DateOnly loggedDate,
        string? description = null, Guid? subTaskId = null) => new()
    {
        TaskId = taskId,
        UserId = userId,
        Hours = hours,
        LoggedDate = loggedDate,
        Description = description,
        SubTaskId = subTaskId,
    };

    public void Update(decimal hours, string? description, DateOnly loggedDate)
    {
        Hours = hours;
        Description = description;
        LoggedDate = loggedDate;
        SetUpdated();
    }
}
```

- [ ] **Step 4: Implement SubTask entity changes**

Replace `backend/src/ProjectManagement.Domain/Entities/SubTask.cs` with:

```csharp
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class SubTask : BaseEntity
{
    public Guid TaskId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public bool IsCompleted { get; private set; }
    public int Order { get; private set; }
    public decimal? EstimatedHours { get; private set; }

    public ProjectTask Task { get; set; } = null!;

    private SubTask() { }

    public static SubTask Create(Guid taskId, string title, int order = 0) => new()
    {
        TaskId = taskId,
        Title = title,
        Order = order,
    };

    public void Toggle()
    {
        IsCompleted = !IsCompleted;
        SetUpdated();
    }

    public void Rename(string title)
    {
        Title = title;
        SetUpdated();
    }

    public void SetEstimatedHours(decimal? hours)
    {
        EstimatedHours = hours;
        SetUpdated();
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --filter "FullyQualifiedName~TimeTracking" -v minimal
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Entities/TimeLog.cs \
        backend/src/ProjectManagement.Domain/Entities/SubTask.cs \
        backend/tests/ProjectManagement.Application.Tests/TimeTracking/
git commit -m "feat: add SubTaskId+Update to TimeLog, EstimatedHours+SetEstimatedHours to SubTask"
```

---

## Task 2: DTOs, AutoMapper, and TaskRepository include

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/TimeLogDto.cs`
- Modify: `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/SubTaskDto.cs`
- Modify: `backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs`

- [ ] **Step 1: Update TimeLogDto**

Replace `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/TimeLogDto.cs` with:

```csharp
namespace ProjectManagement.Application.Features.Tasks.TimeLogs;

public record TimeLogDto
{
    public Guid Id { get; init; }
    public Guid TaskId { get; init; }
    public Guid? SubTaskId { get; init; }
    public string? SubTaskTitle { get; init; }
    public string UserId { get; init; } = default!;
    public string? UserName { get; init; }
    public decimal Hours { get; init; }
    public string? Description { get; init; }
    public DateOnly LoggedDate { get; init; }
    public DateTime CreatedAt { get; init; }
}
```

- [ ] **Step 2: Update SubTaskDto**

Replace `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/SubTaskDto.cs` with:

```csharp
namespace ProjectManagement.Application.Features.Tasks.SubTasks;

public record SubTaskDto
{
    public Guid Id { get; init; }
    public Guid TaskId { get; init; }
    public string Title { get; init; } = default!;
    public bool IsCompleted { get; init; }
    public int Order { get; init; }
    public decimal? EstimatedHours { get; init; }
    public DateTime CreatedAt { get; init; }
}
```

- [ ] **Step 3: Update MappingProfile for TimeLog and SubTask**

In `backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs`, replace:

```csharp
        CreateMap<SubTask, SubTaskDto>();

        CreateMap<TimeLog, TimeLogDto>()
            .ForMember(d => d.UserName, o => o.Ignore());
```

With:

```csharp
        CreateMap<SubTask, SubTaskDto>();

        CreateMap<TimeLog, TimeLogDto>()
            .ForMember(d => d.UserName, o => o.Ignore())
            .ForMember(d => d.SubTaskTitle, o => o.MapFrom(s => s.SubTask != null ? s.SubTask.Title : null));
```

- [ ] **Step 4: Update TaskRepository to ThenInclude SubTask on TimeLogs**

In `backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs`, replace `WithDependencies`:

```csharp
    private static IQueryable<ProjectTask> WithDependencies(IQueryable<ProjectTask> q) =>
        q.Include(t => t.Labels)
         .Include(t => t.SubTasks)
         .Include(t => t.TimeLogs).ThenInclude(tl => tl.SubTask)
         .Include(t => t.Attachments)
         .Include(t => t.BlockedByDependencies).ThenInclude(d => d.BlockingTask)
         .Include(t => t.BlockingDependencies).ThenInclude(d => d.BlockedTask);
```

- [ ] **Step 5: Build to verify no compile errors**

```bash
cd backend && dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj --no-incremental -v quiet
cd backend && dotnet build src/ProjectManagement.Infrastructure/ProjectManagement.Infrastructure.csproj --no-incremental -v quiet
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/TimeLogDto.cs \
        backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/SubTaskDto.cs \
        backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs
git commit -m "feat: add SubTaskId/SubTaskTitle to TimeLogDto, EstimatedHours to SubTaskDto, update AutoMapper"
```

---

## Task 3: EF migration — extend TimeLogs and SubTasks tables

**Files:**
- Create: EF migration (generated)

- [ ] **Step 1: Add the migration**

```bash
cd backend && dotnet ef migrations add ExtendTimeLogAndSubTask \
  --project src/ProjectManagement.Infrastructure \
  --startup-project src/ProjectManagement.WebApi
```

Expected: Migration file created in `src/ProjectManagement.Infrastructure/Persistence/Migrations/`.

- [ ] **Step 2: Verify the generated migration**

Open the generated migration file and confirm it contains:

```csharp
migrationBuilder.AddColumn<Guid>(
    name: "SubTaskId",
    table: "TimeLogs",
    type: "uuid",
    nullable: true);

migrationBuilder.AddColumn<decimal>(
    name: "EstimatedHours",
    table: "SubTasks",
    type: "numeric",
    nullable: true);

migrationBuilder.AddForeignKey(
    name: "FK_TimeLogs_SubTasks_SubTaskId",
    table: "TimeLogs",
    column: "SubTaskId",
    principalTable: "SubTasks",
    principalColumn: "Id");
```

If the FK is missing, EF will still generate a correct index. The important thing is that both columns appear in the Up() method.

- [ ] **Step 3: Apply the migration**

```bash
cd backend && dotnet ef database update \
  --project src/ProjectManagement.Infrastructure \
  --startup-project src/ProjectManagement.WebApi
```

Expected: `Done.` — no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Infrastructure/Persistence/Migrations/
git commit -m "feat: add SubTaskId to TimeLogs table, EstimatedHours to SubTasks table"
```

---

## Task 4: Extend LogTime — add optional SubTaskId

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/LogTimeCommand.cs`
- Modify: `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/LogTimeCommandHandler.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs`

- [ ] **Step 1: Update LogTimeCommand to include SubTaskId?**

Replace `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/LogTimeCommand.cs` with:

```csharp
using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.LogTime;

public record LogTimeCommand(Guid TaskId, decimal Hours, DateOnly LoggedDate, string? Description, Guid? SubTaskId = null)
    : IRequest<Result<TimeLogDto>>;
```

- [ ] **Step 2: Update LogTimeCommandHandler to validate SubTaskId**

Replace `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/LogTimeCommandHandler.cs` with:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.LogTime;

internal sealed class LogTimeCommandHandler(
    ITimeLogRepository repo,
    ITaskRepository taskRepo,
    ISubTaskRepository subTaskRepo,
    ICurrentUserService currentUser)
    : IRequestHandler<LogTimeCommand, Result<TimeLogDto>>
{
    public async Task<Result<TimeLogDto>> Handle(LogTimeCommand request, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(request.TaskId, ct);
        if (task is null) return Error.NotFound("Task.NotFound", "Task not found");

        if (request.SubTaskId.HasValue)
        {
            var subTask = await subTaskRepo.GetByIdAsync(request.SubTaskId.Value, ct);
            if (subTask is null || subTask.TaskId != request.TaskId)
                return Error.Validation("TimeLog.InvalidSubTask", "SubTask does not belong to this task");
        }

        var log = TimeLog.Create(request.TaskId, currentUser.UserId!, request.Hours, request.LoggedDate,
            request.Description, request.SubTaskId);

        await repo.AddAsync(log, ct);
        await repo.SaveAsync(ct);

        return new TimeLogDto
        {
            Id = log.Id, TaskId = log.TaskId, SubTaskId = log.SubTaskId,
            UserId = log.UserId, Hours = log.Hours, Description = log.Description,
            LoggedDate = log.LoggedDate, CreatedAt = log.CreatedAt
        };
    }
}
```

- [ ] **Step 3: Update LogTimeRequest and controller action to accept SubTaskId**

In `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs`, replace:

```csharp
public record LogTimeRequest(decimal Hours, string LoggedDate, string? Description);
```

With:

```csharp
public record LogTimeRequest(decimal Hours, string LoggedDate, string? Description, Guid? SubTaskId = null);
```

And replace the `LogTime` action body:

```csharp
    [HttpPost("{taskId:guid}/timelogs")]
    public async Task<ActionResult<TimeLogDto>> LogTime(Guid taskId, [FromBody] LogTimeRequest req, CancellationToken ct)
    {
        if (!DateOnly.TryParse(req.LoggedDate, out var loggedDate))
            return BadRequest(new { Code = "InvalidDate", Description = "loggedDate must be YYYY-MM-DD" });
        return (await mediator.Send(new LogTimeCommand(taskId, req.Hours, loggedDate, req.Description, req.SubTaskId), ct)).ToActionResult(this);
    }
```

- [ ] **Step 4: Build to verify**

```bash
cd backend && dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj --no-incremental -v quiet
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/LogTime/ \
        backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs
git commit -m "feat: extend LogTime with optional SubTaskId, validate subtask belongs to task"
```

---

## Task 5: Add UpdateTimeLog feature

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/UpdateTimeLogCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/UpdateTimeLogCommandHandler.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs`

- [ ] **Step 1: Create UpdateTimeLogCommand**

Create `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/UpdateTimeLogCommand.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.UpdateTimeLog;

public record UpdateTimeLogCommand(Guid TimeLogId, decimal Hours, string? Description, DateOnly LoggedDate)
    : IRequest<Result<TimeLogDto>>;
```

- [ ] **Step 2: Create UpdateTimeLogCommandHandler**

Create `backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/UpdateTimeLogCommandHandler.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.UpdateTimeLog;

internal sealed class UpdateTimeLogCommandHandler(ITimeLogRepository repo, ICurrentUserService currentUser)
    : IRequestHandler<UpdateTimeLogCommand, Result<TimeLogDto>>
{
    public async Task<Result<TimeLogDto>> Handle(UpdateTimeLogCommand request, CancellationToken ct)
    {
        var log = await repo.GetByIdAsync(request.TimeLogId, ct);
        if (log is null) return Error.NotFound("TimeLog.NotFound", "Time log not found");
        if (log.UserId != currentUser.UserId)
            return Error.Forbidden("TimeLog.Forbidden", "You can only edit your own time logs");

        log.Update(request.Hours, request.Description, request.LoggedDate);
        await repo.SaveAsync(ct);

        return new TimeLogDto
        {
            Id = log.Id, TaskId = log.TaskId, SubTaskId = log.SubTaskId,
            UserId = log.UserId, Hours = log.Hours, Description = log.Description,
            LoggedDate = log.LoggedDate, CreatedAt = log.CreatedAt
        };
    }
}
```

- [ ] **Step 3: Add PUT timelogs/{id} endpoint to TasksController**

In `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs`, add the using and the endpoint.

Add to the using block at top:
```csharp
using ProjectManagement.Application.Features.Tasks.TimeLogs.UpdateTimeLog;
```

Add after the `DeleteTimeLog` action (around line 127):
```csharp
    [HttpPut("timelogs/{timeLogId:guid}")]
    public async Task<ActionResult<TimeLogDto>> UpdateTimeLog(Guid timeLogId, [FromBody] UpdateTimeLogRequest req, CancellationToken ct)
    {
        if (!DateOnly.TryParse(req.LoggedDate, out var loggedDate))
            return BadRequest(new { Code = "InvalidDate", Description = "loggedDate must be YYYY-MM-DD" });
        return (await mediator.Send(new UpdateTimeLogCommand(timeLogId, req.Hours, req.Description, loggedDate), ct)).ToActionResult(this);
    }
```

Add to the request records at the bottom of the file:
```csharp
public record UpdateTimeLogRequest(decimal Hours, string LoggedDate, string? Description);
```

- [ ] **Step 4: Build to verify**

```bash
cd backend && dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj --no-incremental -v quiet
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Tasks/TimeLogs/UpdateTimeLog/ \
        backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs
git commit -m "feat: add UpdateTimeLog command and PUT /api/tasks/timelogs/{id} endpoint"
```

---

## Task 6: Add UpdateSubTask (EstimatedHours) feature

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/UpdateSubTaskCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/UpdateSubTaskCommandHandler.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs`

- [ ] **Step 1: Create UpdateSubTaskCommand**

Create `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/UpdateSubTaskCommand.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.UpdateSubTask;

public record UpdateSubTaskCommand(Guid SubTaskId, decimal? EstimatedHours) : IRequest<Result<SubTaskDto>>;
```

- [ ] **Step 2: Create UpdateSubTaskCommandHandler**

Create `backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/UpdateSubTaskCommandHandler.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.UpdateSubTask;

internal sealed class UpdateSubTaskCommandHandler(ISubTaskRepository repo)
    : IRequestHandler<UpdateSubTaskCommand, Result<SubTaskDto>>
{
    public async Task<Result<SubTaskDto>> Handle(UpdateSubTaskCommand request, CancellationToken ct)
    {
        if (request.EstimatedHours.HasValue && request.EstimatedHours.Value < 0)
            return Error.Validation("SubTask.InvalidEstimate", "EstimatedHours must be >= 0");

        var subTask = await repo.GetByIdAsync(request.SubTaskId, ct);
        if (subTask is null) return Error.NotFound("SubTask.NotFound", "Sub-task not found");

        subTask.SetEstimatedHours(request.EstimatedHours);
        await repo.SaveAsync(ct);

        return new SubTaskDto
        {
            Id = subTask.Id, TaskId = subTask.TaskId, Title = subTask.Title,
            IsCompleted = subTask.IsCompleted, Order = subTask.Order,
            EstimatedHours = subTask.EstimatedHours, CreatedAt = subTask.CreatedAt
        };
    }
}
```

- [ ] **Step 3: Add PATCH subtasks/{id}/estimate endpoint to TasksController**

In `backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs`, add the using:
```csharp
using ProjectManagement.Application.Features.Tasks.SubTasks.UpdateSubTask;
```

Add after the `DeleteSubTask` action:
```csharp
    [HttpPatch("subtasks/{subTaskId:guid}/estimate")]
    public async Task<ActionResult<SubTaskDto>> SetSubTaskEstimate(Guid subTaskId, [FromBody] SetEstimateRequest req, CancellationToken ct)
        => (await mediator.Send(new UpdateSubTaskCommand(subTaskId, req.EstimatedHours), ct)).ToActionResult(this);
```

Add to the request records at bottom of file:
```csharp
public record SetEstimateRequest(decimal? EstimatedHours);
```

- [ ] **Step 4: Build to verify**

```bash
cd backend && dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj --no-incremental -v quiet
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Tasks/SubTasks/UpdateSubTask/ \
        backend/src/ProjectManagement.WebApi/Controllers/TasksController.cs
git commit -m "feat: add UpdateSubTask command and PATCH /api/tasks/subtasks/{id}/estimate endpoint"
```

---

## Task 7: Frontend models and service

**Files:**
- Modify: `frontend/libs/shared/models/src/lib/task.model.ts`
- Modify: `frontend/libs/tasks/data-access/src/lib/task.service.ts`

- [ ] **Step 1: Update TimeLog and SubTask interfaces in task.model.ts**

In `frontend/libs/shared/models/src/lib/task.model.ts`, replace the `SubTask` interface:

```typescript
export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  estimatedHours?: number;
  createdAt: string;
}
```

Replace the `TimeLog` interface:

```typescript
export interface TimeLog {
  id: string;
  taskId: string;
  subTaskId?: string;
  subTaskTitle?: string;
  userId: string;
  userName?: string;
  hours: number;
  description?: string;
  loggedDate: string;
  createdAt: string;
}
```

- [ ] **Step 2: Add updateTimeLog and updateSubTaskEstimate to task.service.ts**

In `frontend/libs/tasks/data-access/src/lib/task.service.ts`, add after the `deleteTimeLog` method:

```typescript
  updateTimeLog(timeLogId: string, hours: number, loggedDate: string, description?: string) {
    return this.http.put<TimeLog>(`${this.base}/timelogs/${timeLogId}`, { hours, loggedDate, description });
  }

  setSubTaskEstimate(subTaskId: string, estimatedHours: number | null) {
    return this.http.patch<SubTask>(`${this.base}/subtasks/${subTaskId}/estimate`, { estimatedHours });
  }
```

Also update `logTime` to accept optional `subTaskId`:

```typescript
  logTime(taskId: string, hours: number, loggedDate: string, description?: string, subTaskId?: string) {
    return this.http.post<TimeLog>(`${this.base}/${taskId}/timelogs`, { hours, loggedDate, description, subTaskId });
  }
```

- [ ] **Step 3: Build frontend to verify**

```bash
cd frontend && pnpm nx run-many -t typecheck 2>&1 | tail -10
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/shared/models/src/lib/task.model.ts \
        frontend/libs/tasks/data-access/src/lib/task.service.ts
git commit -m "feat: add subTaskId/subTaskTitle to TimeLog model, estimatedHours to SubTask model, update service"
```

---

## Task 8: Frontend — time log UX (subtask dropdown, attribution, edit form, delete confirmation)

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

Context: The time log UI lives inside the `<!-- Time tracking -->` section of the task detail panel, around line 862–905 of `project-detail.component.ts`. The component uses Angular signals (`signal()`) and `computed()`. The existing `logTime()` method is around line 2725, `deleteTimeLog()` around line 2744. `this.auth.user()?.userId` returns the current user's ID. `this.selectedTask()!.subTasks` holds the subtask list.

- [ ] **Step 1: Add component state signals for the new UX**

Find the block of state fields near line 2715 (where `newTimeHours`, `newTimeDate`, `newTimeDesc` are declared). Add after `newTimeDesc`:

```typescript
  newTimeSubTaskId: string | null = null;
  editingLogId = signal<string | null>(null);
  editLogHours: number | null = null;
  editLogDate = '';
  editLogDesc = '';
```

- [ ] **Step 2: Add startEditLog and saveEditLog methods**

Add after the `deleteTimeLog` method (~line 2756):

```typescript
  startEditLog(tl: any) {
    this.editingLogId.set(tl.id);
    this.editLogHours = tl.hours;
    this.editLogDate = tl.loggedDate;
    this.editLogDesc = tl.description ?? '';
  }

  saveEditLog(timeLogId: string) {
    const task = this.selectedTask();
    const hours = Number(this.editLogHours);
    if (!task || !hours || hours <= 0) return;
    this.taskService.updateTimeLog(timeLogId, hours, this.editLogDate, this.editLogDesc || undefined)
      .subscribe({
        next: () => {
          this.editingLogId.set(null);
          this.taskService.getById(task.id).subscribe(updated => this.selectedTask.set(updated));
        },
        error: () => this.toast('Failed to update time log', true),
      });
  }

  confirmDeleteTimeLog(timeLogId: string) {
    const tl = this.selectedTask()?.timeLogs?.find(t => t.id === timeLogId);
    if (!confirm(`Delete ${tl?.hours}h log entry?`)) return;
    this.deleteTimeLog(timeLogId);
  }
```

- [ ] **Step 3: Update the log time form to add the subtask dropdown**

Find the log time form template (around line 892–901):

```html
            <form class="timelog-form" (ngSubmit)="logTime()" *ngIf="showTimeLogInput()">
              <input class="timelog-hrs" type="number" [(ngModel)]="newTimeHours" name="hrs"
                     placeholder="Hours" min="0.25" step="0.25" style="width:80px" />
              <input class="timelog-date-input" type="date" [(ngModel)]="newTimeDate" name="dt" />
              <input class="timelog-desc-input" [(ngModel)]="newTimeDesc" name="desc" placeholder="Description (optional)" />
              <button type="submit" class="btn-primary sm" [disabled]="!newTimeHours || newTimeHours <= 0">Log</button>
              <button type="button" class="icon-btn" (click)="showTimeLogInput.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </form>
```

Replace with:

```html
            <form class="timelog-form" (ngSubmit)="logTime()" *ngIf="showTimeLogInput()">
              <input class="timelog-hrs" type="number" [(ngModel)]="newTimeHours" name="hrs"
                     placeholder="Hours" min="0.25" step="0.25" style="width:80px" />
              <input class="timelog-date-input" type="date" [(ngModel)]="newTimeDate" name="dt" />
              <input class="timelog-desc-input" [(ngModel)]="newTimeDesc" name="desc" placeholder="Description (optional)" />
              <select class="filter-select" [(ngModel)]="newTimeSubTaskId" name="subTask"
                      *ngIf="selectedTask()!.subTasks?.length">
                <option [ngValue]="null">Parent task</option>
                <option *ngFor="let st of selectedTask()!.subTasks" [value]="st.id">{{ st.title }}</option>
              </select>
              <button type="submit" class="btn-primary sm" [disabled]="!newTimeHours || newTimeHours <= 0">Log</button>
              <button type="button" class="icon-btn" (click)="showTimeLogInput.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </form>
```

- [ ] **Step 4: Update logTime() method to pass subTaskId**

Find the `logTime()` method (~line 2725). Replace:

```typescript
    this.taskService.logTime(task.id, hours, this.newTimeDate, this.newTimeDesc || undefined).subscribe({
```

With:

```typescript
    this.taskService.logTime(task.id, hours, this.newTimeDate, this.newTimeDesc || undefined, this.newTimeSubTaskId ?? undefined).subscribe({
```

Also reset `newTimeSubTaskId` after successful log. In the `next:` callback, add after `this.showTimeLogInput.set(false)`:

```typescript
        this.newTimeSubTaskId = null;
```

- [ ] **Step 5: Update the time log list to show edit button, attribution label, and inline edit form**

Find the timelog list template (around line 879–890):

```html
            <div class="timelog-list">
              <div *ngFor="let tl of selectedTask()!.timeLogs ?? []" class="timelog-item">
                <span class="material-icons-round timelog-icon">schedule</span>
                <div class="timelog-body">
                  <span class="timelog-hours">{{ tl.hours }}h</span>
                  <span class="timelog-date">{{ tl.loggedDate | date:'MMM d' }}</span>
                  <span class="timelog-desc" *ngIf="tl.description">{{ tl.description }}</span>
                </div>
                <button class="subtask-del" (click)="deleteTimeLog(tl.id)">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>
```

Replace with:

```html
            <div class="timelog-list">
              <div *ngFor="let tl of selectedTask()!.timeLogs ?? []" class="timelog-item">
                <ng-container *ngIf="editingLogId() !== tl.id">
                  <span class="material-icons-round timelog-icon">schedule</span>
                  <div class="timelog-body">
                    <span class="timelog-hours">{{ tl.hours }}h</span>
                    <span class="timelog-date">{{ tl.loggedDate | date:'MMM d' }}</span>
                    <span class="timelog-desc" *ngIf="tl.description">{{ tl.description }}</span>
                    <span class="timelog-subtask" *ngIf="tl.subTaskTitle">· {{ tl.subTaskTitle }}</span>
                  </div>
                  <button class="icon-btn" *ngIf="tl.userId === auth.user()?.userId"
                          (click)="startEditLog(tl)" title="Edit">
                    <span class="material-icons-round" style="font-size:16px">edit</span>
                  </button>
                  <button class="subtask-del" (click)="confirmDeleteTimeLog(tl.id)">
                    <span class="material-icons-round">close</span>
                  </button>
                </ng-container>
                <ng-container *ngIf="editingLogId() === tl.id">
                  <form class="timelog-form" style="flex:1" (ngSubmit)="saveEditLog(tl.id)">
                    <input class="timelog-hrs" type="number" [(ngModel)]="editLogHours" name="editHrs"
                           min="0.25" step="0.25" style="width:80px" />
                    <input class="timelog-date-input" type="date" [(ngModel)]="editLogDate" name="editDt" />
                    <input class="timelog-desc-input" [(ngModel)]="editLogDesc" name="editDesc"
                           placeholder="Description (optional)" />
                    <button type="submit" class="btn-primary sm"
                            [disabled]="!editLogHours || editLogHours <= 0">Save</button>
                    <button type="button" class="icon-btn" (click)="editingLogId.set(null)">
                      <span class="material-icons-round">close</span>
                    </button>
                  </form>
                </ng-container>
              </div>
            </div>
```

- [ ] **Step 6: Build to verify**

```bash
cd frontend && pnpm nx run-many -t typecheck 2>&1 | tail -10
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: add subtask dropdown to log form, attribution label, edit time log inline form"
```

---

## Task 9: Frontend — subtask estimated hours UI

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

Context: The subtask list template is around line 836–857. Each subtask row renders `{{ st.title }}` and has a delete button. There's no edit form currently — just the toggle and delete. We'll add an `estimatedHours` input shown inline when the user clicks "Set estimate" on a subtask row. `this.taskService.setSubTaskEstimate()` is already added in Task 7.

- [ ] **Step 1: Add state signals for subtask estimate editing**

Near where `newSubTaskTitle` is declared (~line 2714), add:

```typescript
  estimatingSubTaskId = signal<string | null>(null);
  estimateHoursInput: number | null = null;
```

- [ ] **Step 2: Add setSubTaskEstimate method**

After the `deleteSubTask` method (~line 2706), add:

```typescript
  setSubTaskEstimate(subTaskId: string) {
    const hours = Number(this.estimateHoursInput);
    if (hours < 0) return;
    this.taskService.setSubTaskEstimate(subTaskId, hours || null).subscribe({
      next: (updated) => {
        this.selectedTask.update(t => t ? {
          ...t, subTasks: (t.subTasks ?? []).map(s => s.id === subTaskId ? { ...s, estimatedHours: updated.estimatedHours } : s)
        } : t);
        this.estimatingSubTaskId.set(null);
        this.estimateHoursInput = null;
      },
      error: () => this.toast('Failed to set estimate', true),
    });
  }
```

- [ ] **Step 3: Update subtask list template to show estimate and estimate input**

Find the subtask list template (around line 836–845):

```html
            <div class="subtask-list">
              <div *ngFor="let st of selectedTask()!.subTasks ?? []" class="subtask-item">
                <button class="subtask-check" [class.checked]="st.isCompleted" (click)="toggleSubTask(st.id)">
                  <span class="material-icons-round">{{ st.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}</span>
                </button>
                <span class="subtask-title" [class.completed]="st.isCompleted">{{ st.title }}</span>
                <button class="subtask-del" (click)="deleteSubTask(st.id)">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>
```

Replace with:

```html
            <div class="subtask-list">
              <div *ngFor="let st of selectedTask()!.subTasks ?? []" class="subtask-item">
                <button class="subtask-check" [class.checked]="st.isCompleted" (click)="toggleSubTask(st.id)">
                  <span class="material-icons-round">{{ st.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}</span>
                </button>
                <span class="subtask-title" [class.completed]="st.isCompleted">{{ st.title }}</span>
                <ng-container *ngIf="estimatingSubTaskId() !== st.id">
                  <span class="timelog-desc" *ngIf="st.estimatedHours" style="margin-left:4px">
                    {{ st.estimatedHours }}h est.
                  </span>
                  <button class="icon-btn" (click)="estimatingSubTaskId.set(st.id); estimateHoursInput = st.estimatedHours ?? null"
                          title="Set estimate" style="font-size:14px">
                    <span class="material-icons-round" style="font-size:14px">timer</span>
                  </button>
                </ng-container>
                <ng-container *ngIf="estimatingSubTaskId() === st.id">
                  <input class="timelog-hrs" type="number" [(ngModel)]="estimateHoursInput"
                         name="est_{{ st.id }}" min="0" step="0.25" style="width:70px"
                         placeholder="Hrs" />
                  <button class="btn-primary sm" (click)="setSubTaskEstimate(st.id)">OK</button>
                  <button class="icon-btn" (click)="estimatingSubTaskId.set(null)">
                    <span class="material-icons-round">close</span>
                  </button>
                </ng-container>
                <button class="subtask-del" (click)="deleteSubTask(st.id)">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>
```

- [ ] **Step 4: Build to verify**

```bash
cd frontend && pnpm nx run-many -t typecheck 2>&1 | tail -10
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj -v minimal
```

Expected: 5+ tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: add estimated hours input to subtask rows"
```

---

## Task 10: Smoke test checklist

Manually verify the following flows with the app running (`cd backend && dotnet run --project src/ProjectManagement.WebApi` + `cd frontend && pnpm nx serve project-management`):

**Log time against a subtask:**
- [ ] Open a task that has at least one subtask.
- [ ] Click "Log time". The subtask dropdown appears with "Parent task" + subtask names.
- [ ] Select a subtask, enter hours, log.
- [ ] The new log row shows `Xh · [subtask title]` in the time log list.
- [ ] `TotalLoggedHours` on the task increases by the logged hours (progress bar updates).

**Edit a time log:**
- [ ] Click the pencil icon on a log you own. Inline form appears pre-filled.
- [ ] Change hours and save. The log row updates and the progress bar adjusts.
- [ ] The pencil icon is NOT shown on logs by other users.

**Delete confirmation:**
- [ ] Click the × on a log. A browser confirm dialog appears.
- [ ] Confirming deletes the log and adjusts the progress bar.
- [ ] Cancelling leaves the log unchanged.

**Subtask estimated hours:**
- [ ] Click the timer icon on a subtask. An hours input appears.
- [ ] Enter a value and click OK. The subtask now shows `Xh est.` inline.
- [ ] The estimate persists after closing and reopening the task panel.

**SubTaskId validation:**
- [ ] In browser DevTools, POST to `/api/tasks/{taskId}/timelogs` with a `subTaskId` from a different task. Response should be 400 with code `TimeLog.InvalidSubTask`.
