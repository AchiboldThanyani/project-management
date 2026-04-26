# Sprint Carry-Over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a PM completes a sprint, let them choose where incomplete tasks go — a future sprint or the backlog — and move them atomically as part of sprint completion.

**Architecture:** Extend `CompleteSprintCommand` with an optional `TargetSprintId` (null = backlog). The handler bulk-updates task `SprintId`s in the same transaction. A new `GET /api/sprints/project/{id}/future` endpoint feeds the frontend dropdown. The existing completion dialog gets a carry-over destination step when incomplete tasks exist.

**Tech Stack:** .NET 9, EF Core 9 (`ExecuteUpdateAsync`), Angular 20 signals, Angular `*ngIf`, `HttpClient`

---

## File Map

**Backend — create:**
- `backend/src/ProjectManagement.Application/Features/Sprints/GetFutureSprintsByProject/GetFutureSprintsByProjectQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Sprints/GetFutureSprintsByProject/GetFutureSprintsByProjectQueryHandler.cs`

**Backend — modify:**
- `backend/src/ProjectManagement.Application/Interfaces/ITaskRepository.cs` — add `BulkUpdateSprintAsync`
- `backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs` — implement it
- `backend/src/ProjectManagement.Application/Interfaces/ISprintRepository.cs` — add `GetFutureSprintsForProjectAsync`
- `backend/src/ProjectManagement.Infrastructure/Repositories/SprintRepository.cs` — implement it
- `backend/src/ProjectManagement.Application/Features/Sprints/SprintErrors.cs` — add `InvalidCarryOverTarget`
- `backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommand.cs` — add `TargetSprintId`
- `backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommandHandler.cs` — bulk-update + validate target
- `backend/src/ProjectManagement.WebApi/Controllers/SprintsController.cs` — update request record + add future sprints endpoint

**Frontend — modify:**
- `frontend/libs/projects/data-access/src/lib/project.service.ts` — update `completeSprint`, add `getFutureSprints`
- `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts` — extend completion dialog

---

## Task 1: Add `BulkUpdateSprintAsync` to task repository

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Interfaces/ITaskRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs`

- [ ] **Step 1: Add method to the interface**

Open `ITaskRepository.cs`. Add one method:

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ITaskRepository : IRepository<ProjectTask>
{
    Task<ProjectTask?> GetByIdWithLabelsAsync(Guid taskId, CancellationToken ct = default);
    Task BulkUpdateSprintAsync(IEnumerable<Guid> taskIds, Guid? sprintId, CancellationToken ct);
}
```

- [ ] **Step 2: Implement in `TaskRepository.cs`**

Add the implementation using EF Core's `ExecuteUpdateAsync` — single SQL statement, no N+1:

```csharp
public async Task BulkUpdateSprintAsync(IEnumerable<Guid> taskIds, Guid? sprintId, CancellationToken ct)
{
    var ids = taskIds.ToList();
    if (ids.Count == 0) return;

    await context.Tasks
        .Where(t => ids.Contains(t.Id))
        .ExecuteUpdateAsync(s => s.SetProperty(t => t.SprintId, sprintId), ct);
}
```

Add this after the `GetByIdWithLabelsAsync` method. The full updated file:

```csharp
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TaskRepository(ApplicationDbContext context)
    : Repository<ProjectTask>(context), ITaskRepository
{
    public override async Task<ProjectTask?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await WithDependencies(context.Tasks).FirstOrDefaultAsync(t => t.Id == id, ct);

    public override async Task<(IReadOnlyList<ProjectTask> Items, int TotalCount)> FindPagedAsync(
        Expression<Func<ProjectTask, bool>> predicate, int page, int pageSize, CancellationToken ct = default)
    {
        var query = WithDependencies(context.Tasks).Where(predicate);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task<ProjectTask?> GetByIdWithLabelsAsync(Guid taskId, CancellationToken ct = default) =>
        await WithDependencies(context.Tasks).FirstOrDefaultAsync(t => t.Id == taskId, ct);

    public async Task BulkUpdateSprintAsync(IEnumerable<Guid> taskIds, Guid? sprintId, CancellationToken ct)
    {
        var ids = taskIds.ToList();
        if (ids.Count == 0) return;
        await context.Tasks
            .Where(t => ids.Contains(t.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.SprintId, sprintId), ct);
    }

    private static IQueryable<ProjectTask> WithDependencies(IQueryable<ProjectTask> q) =>
        q.Include(t => t.Labels)
         .Include(t => t.SubTasks)
         .Include(t => t.TimeLogs)
         .Include(t => t.Attachments)
         .Include(t => t.BlockedByDependencies).ThenInclude(d => d.BlockingTask)
         .Include(t => t.BlockingDependencies).ThenInclude(d => d.BlockedTask);
}
```

- [ ] **Step 3: Build to confirm no errors**

```bash
cd backend && dotnet build src/ProjectManagement.sln -c Release --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Interfaces/ITaskRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/TaskRepository.cs
git commit -m "feat: add BulkUpdateSprintAsync to task repository"
```

---

## Task 2: Add `GetFutureSprintsForProjectAsync` to sprint repository

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Interfaces/ISprintRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Repositories/SprintRepository.cs`

- [ ] **Step 1: Add method to the interface**

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ISprintRepository : IRepository<Sprint>
{
    Task<Sprint?> GetActiveSprintForProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Sprint>> GetFutureSprintsForProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Implement in `SprintRepository.cs`**

Future sprints = not active, not completed, ordered by start date:

```csharp
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class SprintRepository(ApplicationDbContext context)
    : Repository<Sprint>(context), ISprintRepository
{
    public Task<Sprint?> GetActiveSprintForProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
        => context.Sprints
            .FirstOrDefaultAsync(s => s.ProjectId == projectId && s.IsActive, cancellationToken);

    public async Task<IReadOnlyList<Sprint>> GetFutureSprintsForProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
        => await context.Sprints
            .Where(s => s.ProjectId == projectId && !s.IsActive && !s.IsCompleted)
            .OrderBy(s => s.StartDate)
            .ToListAsync(cancellationToken);
}
```

- [ ] **Step 3: Build**

```bash
cd backend && dotnet build src/ProjectManagement.sln -c Release --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Interfaces/ISprintRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/SprintRepository.cs
git commit -m "feat: add GetFutureSprintsForProjectAsync to sprint repository"
```

---

## Task 3: Add `GetFutureSprintsByProject` query + endpoint

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Sprints/GetFutureSprintsByProject/GetFutureSprintsByProjectQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Sprints/GetFutureSprintsByProject/GetFutureSprintsByProjectQueryHandler.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/SprintsController.cs`

- [ ] **Step 1: Create the query record**

```csharp
// GetFutureSprintsByProjectQuery.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.GetFutureSprintsByProject;

public sealed record GetFutureSprintsByProjectQuery(Guid ProjectId)
    : IQuery<IReadOnlyList<SprintDto>>;
```

- [ ] **Step 2: Create the query handler**

```csharp
// GetFutureSprintsByProjectQueryHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.GetFutureSprintsByProject;

internal sealed class GetFutureSprintsByProjectQueryHandler(ISprintRepository repository, IMapper mapper)
    : IRequestHandler<GetFutureSprintsByProjectQuery, Result<IReadOnlyList<SprintDto>>>
{
    public async Task<Result<IReadOnlyList<SprintDto>>> Handle(
        GetFutureSprintsByProjectQuery request, CancellationToken cancellationToken)
    {
        var sprints = await repository.GetFutureSprintsForProjectAsync(request.ProjectId, cancellationToken);
        return Result<IReadOnlyList<SprintDto>>.Success(mapper.Map<IReadOnlyList<SprintDto>>(sprints));
    }
}
```

- [ ] **Step 3: Update `CompleteSprintCommand.cs` to add `TargetSprintId`**

This must be done before the controller update so the build stays green:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.CompleteSprint;

public sealed record CompleteSprintCommand(
    Guid Id,
    string? RetroNotes = null,
    Guid? TargetSprintId = null
) : ICommand<SprintDto>;
```

- [ ] **Step 4: Add endpoint to `SprintsController.cs`**

Add one new route. The controller currently handles sprint-level operations. Add a project-scoped GET for future sprints:

```csharp
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Sprints.ActivateSprint;
using ProjectManagement.Application.Features.Sprints.CompleteSprint;
using ProjectManagement.Application.Features.Sprints.DeleteSprint;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Features.Sprints.GetFutureSprintsByProject;
using ProjectManagement.Application.Features.Sprints.UpdateSprint;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SprintsController(IMediator mediator) : ControllerBase
{
    [HttpGet("project/{projectId:guid}/future")]
    public async Task<ActionResult<IReadOnlyList<SprintDto>>> GetFuture(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetFutureSprintsByProjectQuery(projectId), ct)).ToActionResult(this);

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SprintDto>> Update(Guid id, [FromBody] UpdateSprintRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateSprintCommand(id, request.Name, request.Goal, request.StartDate, request.EndDate), ct)).ToActionResult(this);

    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<SprintDto>> Activate(Guid id, CancellationToken ct)
        => (await mediator.Send(new ActivateSprintCommand(id), ct)).ToActionResult(this);

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<SprintDto>> Complete(Guid id, [FromBody] CompleteSprintRequest req, CancellationToken ct)
        => (await mediator.Send(new CompleteSprintCommand(id, req.RetroNotes, req.TargetSprintId), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await mediator.Send(new DeleteSprintCommand(id), ct)).ToActionResult(this);
}

public record UpdateSprintRequest(string Name, string? Goal, DateTime StartDate, DateTime EndDate);
public record CompleteSprintRequest(string? RetroNotes = null, Guid? TargetSprintId = null);
```

- [ ] **Step 5: Build**

```bash
cd backend && dotnet build src/ProjectManagement.sln -c Release --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Sprints/GetFutureSprintsByProject/ \
        backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommand.cs \
        backend/src/ProjectManagement.WebApi/Controllers/SprintsController.cs
git commit -m "feat: add GET future sprints endpoint and TargetSprintId to complete command"
```

---

## Task 4: Extend the handler with carry-over logic

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Sprints/SprintErrors.cs`
- Modify: `backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommandHandler.cs`

- [ ] **Step 1: Add `InvalidCarryOverTarget` to `SprintErrors.cs`**

Open `SprintErrors.cs` and add one new error (keep all existing errors):

```csharp
public static Error InvalidCarryOverTarget(Guid targetId) =>
    Error.Validation("Sprint.InvalidCarryOverTarget",
        $"Sprint {targetId} is not a valid carry-over target. It must belong to the same project and not be completed.");
```

- [ ] **Step 2: Rewrite the handler with carry-over logic**

The handler must:
1. Load the sprint being completed
2. Check permissions (unchanged)
3. If `TargetSprintId` provided: load target sprint, validate it belongs to the same project and is not completed
4. Find incomplete tasks in this sprint
5. Bulk-update their `SprintId` to `TargetSprintId` (or null for backlog)
6. Complete the sprint
7. Log activity with destination info
8. Save

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;
using ProjectMemberRole = ProjectManagement.Domain.Enums.ProjectMemberRole;

namespace ProjectManagement.Application.Features.Sprints.CompleteSprint;

internal sealed class CompleteSprintCommandHandler(
    ISprintRepository repository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CompleteSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(CompleteSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(sprint.ProjectId, currentUser.UserId, ProjectMemberRole.Lead, cancellationToken))
            return Error.Forbidden("Sprint.Forbidden", "You must be a Lead or Manager to complete sprints.");

        // Validate carry-over target if provided
        if (request.TargetSprintId.HasValue)
        {
            var target = await repository.GetByIdAsync(request.TargetSprintId.Value, cancellationToken);
            if (target is null || target.ProjectId != sprint.ProjectId || target.IsCompleted)
                return SprintErrors.InvalidCarryOverTarget(request.TargetSprintId.Value);
        }

        // Find incomplete tasks in this sprint
        var (incompleteTasks, _) = await taskRepository.FindPagedAsync(
            t => t.SprintId == request.Id
              && t.Status != TaskStatus.Done
              && t.Status != TaskStatus.Cancelled,
            1, 1000, cancellationToken);

        var carryOverCount = incompleteTasks.Count;

        // Move incomplete tasks
        if (carryOverCount > 0)
        {
            var taskIds = incompleteTasks.Select(t => t.Id);
            await taskRepository.BulkUpdateSprintAsync(taskIds, request.TargetSprintId, cancellationToken);
        }

        sprint.Complete(request.RetroNotes);
        await repository.UpdateAsync(sprint, cancellationToken);

        var destination = request.TargetSprintId.HasValue
            ? $"Sprint {request.TargetSprintId.Value}"
            : "backlog";

        var activityMsg = carryOverCount > 0
            ? $"completed sprint \"{sprint.Name}\" — {carryOverCount} task(s) moved to {destination}"
            : $"completed sprint \"{sprint.Name}\"";

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            activityMsg, "Sprint", sprint.Id, sprint.Name);
        await activityRepository.AddAsync(log, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = mapper.Map<SprintDto>(sprint);
        return dto with { CarryOverCount = carryOverCount };
    }
}
```

- [ ] **Step 4: Build**

```bash
cd backend && dotnet build src/ProjectManagement.sln -c Release --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Sprints/SprintErrors.cs \
        backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommand.cs \
        backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommandHandler.cs
git commit -m "feat: implement sprint carry-over in complete sprint handler"
```

---

## Task 5: Update frontend `ProjectService`

**Files:**
- Modify: `frontend/libs/projects/data-access/src/lib/project.service.ts`

- [ ] **Step 1: Update `completeSprint` and add `getFutureSprints`**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { CreateProjectRequest, Project, UpdateProjectRequest } from '@pm/shared/models';
import { CreateSprintRequest, Sprint, UpdateSprintRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly base = `${environment.apiUrl}/projects`;
  private readonly sprintsBase = `${environment.apiUrl}/sprints`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<PagedResult<Project>>(this.base).pipe(map(r => r.items));
  }

  getById(id: string) {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  create(request: CreateProjectRequest) {
    return this.http.post<Project>(this.base, request);
  }

  update(id: string, request: UpdateProjectRequest) {
    return this.http.put<Project>(`${this.base}/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getSprints(projectId: string) {
    return this.http.get<Sprint[]>(`${this.base}/${projectId}/sprints`);
  }

  getFutureSprints(projectId: string) {
    return this.http.get<Sprint[]>(`${this.sprintsBase}/project/${projectId}/future`);
  }

  createSprint(projectId: string, request: CreateSprintRequest) {
    return this.http.post<Sprint>(`${this.base}/${projectId}/sprints`, request);
  }

  updateSprint(sprintId: string, request: UpdateSprintRequest) {
    return this.http.put<Sprint>(`${this.sprintsBase}/${sprintId}`, request);
  }

  deleteSprint(sprintId: string) {
    return this.http.delete<void>(`${this.sprintsBase}/${sprintId}`);
  }

  activateSprint(sprintId: string) {
    return this.http.post<Sprint>(`${this.sprintsBase}/${sprintId}/activate`, {});
  }

  completeSprint(sprintId: string, retroNotes?: string, targetSprintId?: string | null) {
    return this.http.post<Sprint>(`${this.sprintsBase}/${sprintId}/complete`, {
      retroNotes: retroNotes ?? null,
      targetSprintId: targetSprintId ?? null,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/libs/projects/data-access/src/lib/project.service.ts
git commit -m "feat: update ProjectService with getFutureSprints and targetSprintId on completeSprint"
```

---

## Task 6: Extend the completion dialog in `project-detail.component.ts`

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

The existing dialog (lines ~1459–1483) shows a static warning "will be carried over to the backlog." We need to replace that with a target sprint dropdown when future sprints exist, and load future sprints when the dialog opens.

- [ ] **Step 1: Add signals for carry-over state**

Find the block at line ~2488 (where `completingSprintId` and `completingSprintCarryOver` are declared) and add two more fields:

```typescript
completingSprintId = signal<string | null>(null);
completingSprintRetroNotes = '';
completingSprintTargetId: string | null = null;   // null = backlog
futureSprints = signal<Sprint[]>([]);

completingSprintCarryOver = computed(() => {
  const id = this.completingSprintId();
  if (!id) return 0;
  return this.tasks().filter(
    t => t.sprintId === id
      && t.status !== TaskStatus.Done
      && t.status !== TaskStatus.Cancelled
  ).length;
});
```

- [ ] **Step 2: Update `openCompleteSprint` to load future sprints**

Find the `openCompleteSprint` method (~line 3239) and update it:

```typescript
openCompleteSprint(s: Sprint) {
  this.completingSprintId.set(s.id);
  this.completingSprintRetroNotes = '';
  this.completingSprintTargetId = null;
  this.futureSprints.set([]);

  const projectId = this.project()?.id;
  if (projectId) {
    this.projectService.getFutureSprints(projectId).subscribe({
      next: sprints => this.futureSprints.set(sprints),
    });
  }
}
```

- [ ] **Step 3: Update `cancelCompleteSprint` to reset new state**

```typescript
cancelCompleteSprint() {
  this.completingSprintId.set(null);
  this.completingSprintRetroNotes = '';
  this.completingSprintTargetId = null;
  this.futureSprints.set([]);
}
```

- [ ] **Step 4: Update `confirmCompleteSprint` to pass `targetSprintId` and show destination in toast**

Capture `targetName` before calling `cancelCompleteSprint()` because that clears `futureSprints`:

```typescript
confirmCompleteSprint() {
  const id = this.completingSprintId();
  if (!id) return;
  const notes = this.completingSprintRetroNotes.trim() || undefined;
  const targetId = this.completingSprintTargetId;
  const carryCount = this.completingSprintCarryOver();
  const targetName = targetId
    ? (this.futureSprints().find(s => s.id === targetId)?.name ?? 'next sprint')
    : 'backlog';
  this.cancelCompleteSprint();

  this.projectService.completeSprint(id, notes, targetId).subscribe({
    next: updated => {
      this.sprints.update(all => all.map(x => x.id === updated.id ? updated : x));
      const msg = carryCount > 0
        ? `Sprint completed — ${carryCount} task(s) moved to ${targetName}`
        : 'Sprint completed';
      this.toast(msg);
    },
    error: () => this.toast('Failed to complete sprint', true),
  });
}
```

- [ ] **Step 5: Replace the dialog template section**

Find the "Complete Sprint Dialog" block (~lines 1459–1483) and replace the `<ng-container *ngIf="completingSprintCarryOver() > 0">` section with the new dropdown UI:

```html
<!-- Complete Sprint Dialog -->
<div class="overlay" *ngIf="completingSprintId()" (click)="cancelCompleteSprint()">
  <div class="dialog-card" (click)="$event.stopPropagation()" style="max-width:460px">
    <div class="dialog-header">
      <h3 class="dialog-title">Complete Sprint</h3>
      <button class="icon-btn" (click)="cancelCompleteSprint()">
        <span class="material-icons-round">close</span>
      </button>
    </div>

    <ng-container *ngIf="completingSprintCarryOver() > 0">
      <div class="retro-carry-warn">
        <span class="material-icons-round">warning</span>
        <span><strong>{{ completingSprintCarryOver() }} incomplete task(s)</strong> will be carried over.</span>
      </div>
      <div class="field-group" style="margin-top:12px">
        <label class="field-label">Move incomplete tasks to</label>
        <select class="field-input" style="padding:8px 10px"
                [(ngModel)]="completingSprintTargetId">
          <option [ngValue]="null">Backlog</option>
          <option *ngFor="let s of futureSprints()" [ngValue]="s.id">{{ s.name }}</option>
        </select>
        <p *ngIf="futureSprints().length === 0" style="font-size:12px;color:var(--soft);margin:4px 0 0">
          No planned sprints — tasks will go to the backlog.
        </p>
      </div>
    </ng-container>

    <div class="field-group" [style.margin-top]="completingSprintCarryOver() > 0 ? '16px' : '0'">
      <label class="field-label">Retrospective Notes <span style="font-weight:400;text-transform:none">(optional)</span></label>
      <textarea class="field-input" rows="5" placeholder="What went well? What could be improved?" [(ngModel)]="completingSprintRetroNotes"></textarea>
    </div>

    <div class="form-actions">
      <button class="btn-ghost" (click)="cancelCompleteSprint()">Cancel</button>
      <button class="btn-primary" (click)="confirmCompleteSprint()">Complete Sprint</button>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: extend sprint completion dialog with carry-over destination picker"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Start backend**

```bash
cd backend && dotnet run --project src/ProjectManagement.WebApi
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && pnpm nx serve project-management
```

- [ ] **Step 3: Test — no incomplete tasks**

Log in as Alice (PM). Open "ProjectHub Platform" → Sprints tab. Complete Sprint 1 (already completed in seed, so complete Sprint 2 instead). If all tasks are Done/Cancelled → dialog shows only retro notes, no carry-over section. Complete it. Snackbar: "Sprint completed".

- [ ] **Step 4: Test — incomplete tasks, no future sprints**

Create a new sprint with no tasks, activate it, then complete it while another task (not Done) is in it. With no future planned sprints → dropdown is hidden, info text shows "No planned sprints". Complete → tasks move to backlog (verify in Board tab → "Backlog" filter).

- [ ] **Step 5: Test — incomplete tasks, future sprint exists**

Create Sprint A (active, has incomplete tasks) and Sprint B (planned). Complete Sprint A. Dialog shows the carry-over section with Sprint B in the dropdown. Select Sprint B. Complete. Snackbar: "Sprint completed — N task(s) moved to Sprint B". Check Board → filter by Sprint B → tasks appear there.

- [ ] **Step 6: Test — invalid target (API level)**

Use the Scalar API docs at `http://localhost:5000/scalar` (or whatever port). POST `/api/sprints/{id}/complete` with a `targetSprintId` from a different project. Expect `400` with error code `Sprint.InvalidCarryOverTarget`.

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: smoke test corrections for sprint carry-over"
```
