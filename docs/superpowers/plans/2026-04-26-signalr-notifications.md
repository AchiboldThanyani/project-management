# SignalR Notification Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire five missing notification events (TaskBlocked real-time push, comment added, sprint activated, sprint completed, added to project) so every affected user receives a persisted DB notification and a real-time SignalR push.

**Architecture:** Each handler already holds the repositories it needs; we add notification calls after the primary action succeeds but before `SaveChangesAsync`, keeping everything atomic. A new `GetMemberUserIdsAsync` method on `IProjectMemberRepository` provides a lightweight member list for sprint events. The frontend `iconFor()` switch gains four new cases.

**Tech Stack:** .NET 9, MediatR, EF Core, SignalR, Angular 20 (signals), xUnit

---

## File Map

| File | Action |
|------|--------|
| `backend/src/ProjectManagement.Domain/Enums/NotificationType.cs` | Modify — add 4 values |
| `backend/src/ProjectManagement.Application/Interfaces/IProjectMemberRepository.cs` | Modify — add `GetMemberUserIdsAsync` |
| `backend/src/ProjectManagement.Infrastructure/Repositories/ProjectMemberRepository.cs` | Modify — implement `GetMemberUserIdsAsync` |
| `backend/src/ProjectManagement.Application/Features/Tasks/EventHandlers/TaskStatusChangedEventHandler.cs` | Modify — add `NotifyUser` call for TaskBlocked |
| `backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs` | Modify — add comment notifications |
| `backend/src/ProjectManagement.Application/Features/Sprints/ActivateSprint/ActivateSprintCommandHandler.cs` | Modify — add SprintStarted notifications |
| `backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommandHandler.cs` | Modify — add SprintCompleted notifications |
| `backend/src/ProjectManagement.Application/Features/ProjectMembers/AddProjectMember/AddProjectMemberCommandHandler.cs` | Modify — add AddedToProject notification |
| `frontend/libs/layout/feature/src/lib/notification-bell.component.ts` | Modify — add 4 icon cases |

---

### Task 1: Add new NotificationType enum values

**Files:**
- Modify: `backend/src/ProjectManagement.Domain/Enums/NotificationType.cs`

- [ ] **Step 1: Replace the enum body**

Replace the contents of `NotificationType.cs` with:

```csharp
namespace ProjectManagement.Domain.Enums;

public enum NotificationType
{
    TaskAssigned    = 0,
    TaskBlocked     = 1,
    TaskOverdue     = 2,
    TicketReplied   = 3,
    SlaBreached     = 4,
    CommentAdded    = 5,
    SprintStarted   = 6,
    SprintCompleted = 7,
    AddedToProject  = 8,
}
```

- [ ] **Step 2: Build to verify no compile errors**

Run from `backend/`:
```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Enums/NotificationType.cs
git commit -m "feat: add CommentAdded, SprintStarted, SprintCompleted, AddedToProject notification types"
```

---

### Task 2: Add `GetMemberUserIdsAsync` to `IProjectMemberRepository`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Interfaces/IProjectMemberRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Repositories/ProjectMemberRepository.cs`

- [ ] **Step 1: Add the method to the interface**

In `IProjectMemberRepository.cs`, add one line inside the interface body:

```csharp
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IProjectMemberRepository : IRepository<ProjectMember>
{
    Task<IReadOnlyList<ProjectMemberDto>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<ProjectMemberDto?> GetDtoByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetMemberUserIdsAsync(Guid projectId, CancellationToken ct = default);
}
```

- [ ] **Step 2: Implement in `ProjectMemberRepository.cs`**

Add the following method to the `ProjectMemberRepository` class (after `GetDtoByIdAsync`):

```csharp
public async Task<IReadOnlyList<string>> GetMemberUserIdsAsync(
    Guid projectId, CancellationToken ct = default)
{
    return await db.ProjectMembers
        .Where(m => m.ProjectId == projectId)
        .Select(m => m.UserId)
        .ToListAsync(ct);
}
```

`ProjectMember.UserId` is a `string` field.

- [ ] **Step 3: Build to verify no compile errors**

```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Interfaces/IProjectMemberRepository.cs
git add backend/src/ProjectManagement.Infrastructure/Repositories/ProjectMemberRepository.cs
git commit -m "feat: add GetMemberUserIdsAsync to IProjectMemberRepository"
```

---

### Task 3: Fix TaskBlocked real-time push in `TaskStatusChangedEventHandler`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Tasks/EventHandlers/TaskStatusChangedEventHandler.cs`

**Context:** The handler already creates a `Notification` entity for `TaskStatus.Blocked` and calls `notificationService.NotifyTaskStatusChanged` at the end, but it never calls `notificationService.NotifyUser` for the blocker's assignee. The `INotificationService` is already injected. We only need to add the `NotifyUser` call inside the `if (e.NewStatus == TaskStatus.Blocked)` block, **after** `notificationRepo.AddAsync` and **before** `unitOfWork.SaveChangesAsync`.

The `NotifyUser` signature is:
```csharp
Task NotifyUser(string userId, string title, string body, NotificationType type, Guid? relatedEntityId = null, CancellationToken ct = default);
```

The notification's `UserId` is set to `e.ChangedByUserId` in the existing code — but the intent is to notify the person **blocked**, which in this context is `e.ChangedByUserId` (the task's actor). Check: the `TaskStatusChangedEvent` contains `ChangedByUserId` (who triggered the change). If the spec intended to notify the assignee, the assignee id would come from `e.AssigneeId` if that field exists on the event.

Let's check: The current `Notification.Create` call uses `userId: e.ChangedByUserId` — notify that same user via SignalR.

- [ ] **Step 1: Add the `NotifyUser` call**

Replace the `if (e.NewStatus == TaskStatus.Blocked)` block with:

```csharp
if (e.NewStatus == TaskStatus.Blocked)
{
    var n = Notification.Create(
        userId: e.ChangedByUserId,
        title: "Task blocked",
        body: $"\"{e.TaskTitle}\" was marked as Blocked",
        type: NotificationType.TaskBlocked,
        relatedEntityId: e.TaskId);
    await notificationRepo.AddAsync(n, ct);
    await notificationService.NotifyUser(
        e.ChangedByUserId, "Task blocked",
        $"\"{e.TaskTitle}\" was marked as Blocked",
        NotificationType.TaskBlocked, e.TaskId, ct);
}
```

`ChangedByUserId` is a `string` in `TaskStatusChangedEvent`.

- [ ] **Step 2: Build**

```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Tasks/EventHandlers/TaskStatusChangedEventHandler.cs
git commit -m "fix: fire NotifyUser SignalR push when task is marked Blocked"
```

---

### Task 4: Add comment notifications in `CreateCommentCommandHandler`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs`

**Context:** When a comment is posted, notify:
- The task's assignee (if any and not the commenter)
- All users who have previously commented on the task (excluding the commenter)
Recipients are deduplicated. `ITaskRepository.FindAsync` can load the task to get `AssigneeId` and `ProjectId`. `ICommentRepository.FindAsync` loads prior comments.

The current handler only has `ICommentRepository`, `IUnitOfWork`, and `IMapper`. We need to add `ITaskRepository`, `ICurrentUserService`, `INotificationRepository`, and `INotificationService`.

`CreateCommentCommand` has `TaskId`, `AuthorId`, and `Content` fields (verify from the command record if needed).

- [ ] **Step 1: Replace `CreateCommentCommandHandler.cs`**

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Comments.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Comments.CreateComment;

internal sealed class CreateCommentCommandHandler(
    ICommentRepository repository,
    ITaskRepository taskRepository,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateCommentCommand, Result<CommentDto>>
{
    public async Task<Result<CommentDto>> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = Comment.Create(request.Content, request.TaskId, request.AuthorId);
        await repository.AddAsync(comment, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Load task for assignee and project info
        var tasks = await taskRepository.FindAsync(t => t.Id == request.TaskId, cancellationToken);
        var task = tasks.FirstOrDefault();
        if (task is null)
            return mapper.Map<CommentDto>(comment);

        // Collect recipients: assignee + prior comment authors, deduped, excluding commenter
        var currentUserId = currentUser.UserId; // string
        var recipients = new HashSet<string>();

        if (task.AssigneeId is not null && task.AssigneeId != currentUserId)
            recipients.Add(task.AssigneeId);

        var priorComments = await repository.FindAsync(
            c => c.TaskId == request.TaskId && c.Id != comment.Id, cancellationToken);
        foreach (var c in priorComments)
        {
            if (c.AuthorId != currentUserId)
                recipients.Add(c.AuthorId);
        }

        foreach (var recipientId in recipients)
        {
            var n = Notification.Create(
                userId: recipientId,
                title: "New comment",
                body: $"New comment on \"{task.Title}\"",
                type: NotificationType.CommentAdded,
                relatedEntityId: task.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
            await notificationService.NotifyUser(
                recipientId, "New comment",
                $"New comment on \"{task.Title}\"",
                NotificationType.CommentAdded, task.Id, cancellationToken);
        }

        return mapper.Map<CommentDto>(comment);
    }
}
```

**Note:** `Comment.AuthorId` is `string`, `ProjectTask.Title` is `string`, `ProjectTask.AssigneeId` is `string?` — all confirmed.

- [ ] **Step 2: Build**

```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs
git commit -m "feat: notify assignee and prior commenters when comment is posted"
```

---

### Task 5: Add SprintStarted notifications in `ActivateSprintCommandHandler`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Sprints/ActivateSprint/ActivateSprintCommandHandler.cs`

**Context:** After a sprint is activated and saved, notify all project members except the activator. We need to add `IProjectMemberRepository`, `INotificationRepository`, and `INotificationService` to the handler.

- [ ] **Step 1: Replace `ActivateSprintCommandHandler.cs`**

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.ActivateSprint;

internal sealed class ActivateSprintCommandHandler(
    ISprintRepository repository,
    IActivityRepository activityRepository,
    IProjectMemberRepository memberRepository,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<ActivateSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(ActivateSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(sprint.ProjectId, currentUser.UserId, ProjectMemberRole.Lead, cancellationToken))
            return Error.Forbidden("Sprint.Forbidden", "You must be a Lead or Manager to activate sprints.");

        // Deactivate any currently active sprint in the same project before activating this one
        var currentActive = await repository.GetActiveSprintForProjectAsync(sprint.ProjectId, cancellationToken);
        if (currentActive is not null && currentActive.Id != sprint.Id)
        {
            currentActive.Complete();
            await repository.UpdateAsync(currentActive, cancellationToken);
        }

        sprint.Activate();
        await repository.UpdateAsync(sprint, cancellationToken);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"activated sprint \"{sprint.Name}\"", "Sprint", sprint.Id, sprint.Name);
        await activityRepository.AddAsync(log, cancellationToken);

        // Notify all project members except the activator
        var memberIds = await memberRepository.GetMemberUserIdsAsync(sprint.ProjectId, cancellationToken);
        foreach (var memberId in memberIds)
        {
            if (memberId == currentUser.UserId) continue;
            var n = Notification.Create(
                userId: memberId,
                title: "Sprint started",
                body: $"Sprint \"{sprint.Name}\" has started",
                type: NotificationType.SprintStarted,
                relatedEntityId: sprint.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
            await notificationService.NotifyUser(
                memberId, "Sprint started",
                $"Sprint \"{sprint.Name}\" has started",
                NotificationType.SprintStarted, sprint.Id, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<SprintDto>(sprint);
    }
}
```

**Note:** Both `currentUser.UserId` and `memberId` from `GetMemberUserIdsAsync` are `string`, so the comparison is a direct `==`. `ProjectMemberRole` is imported via `ProjectManagement.Domain.Enums` — add the using if the build fails.

- [ ] **Step 2: Build**

```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Sprints/ActivateSprint/ActivateSprintCommandHandler.cs
git commit -m "feat: notify project members when sprint is activated"
```

---

### Task 6: Add SprintCompleted notifications in `CompleteSprintCommandHandler`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommandHandler.cs`

**Context:** Same pattern as Task 5 — after the sprint is marked complete and the activity is logged, notify all project members except the user who completed it. The handler already has `ICurrentUserService`; add `IProjectMemberRepository`, `INotificationRepository`, and `INotificationService`.

- [ ] **Step 1: Replace `CompleteSprintCommandHandler.cs`**

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
    IProjectMemberRepository memberRepository,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
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

        // Notify all project members except the person who completed the sprint
        var memberIds = await memberRepository.GetMemberUserIdsAsync(sprint.ProjectId, cancellationToken);
        foreach (var memberId in memberIds)
        {
            if (memberId == currentUser.UserId) continue;
            var n = Notification.Create(
                userId: memberId,
                title: "Sprint completed",
                body: $"Sprint \"{sprint.Name}\" has been completed",
                type: NotificationType.SprintCompleted,
                relatedEntityId: sprint.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
            await notificationService.NotifyUser(
                memberId, "Sprint completed",
                $"Sprint \"{sprint.Name}\" has been completed",
                NotificationType.SprintCompleted, sprint.Id, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = mapper.Map<SprintDto>(sprint);
        return dto with { CarryOverCount = carryOverCount };
    }
}
```

- [ ] **Step 2: Build**

```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Sprints/CompleteSprint/CompleteSprintCommandHandler.cs
git commit -m "feat: notify project members when sprint is completed"
```

---

### Task 7: Add AddedToProject notification in `AddProjectMemberCommandHandler`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/ProjectMembers/AddProjectMember/AddProjectMemberCommandHandler.cs`

**Context:** After a member is added, send one notification to the newly added user. We need the project name for the message — add `IProjectRepository`. Also add `INotificationRepository` and `INotificationService`.

`request.UserId` is a `string`. `INotificationService.NotifyUser` takes a `string` userId.

- [ ] **Step 1: Replace `AddProjectMemberCommandHandler.cs`**

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMembers.AddProjectMember;

internal sealed class AddProjectMemberCommandHandler(
    IProjectMemberRepository repo,
    IProjectRepository projectRepo,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUserRepository users,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddProjectMemberCommand, Result<ProjectMemberDto>>
{
    public async Task<Result<ProjectMemberDto>> Handle(
        AddProjectMemberCommand request, CancellationToken cancellationToken)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, cancellationToken))
            return Error.Forbidden("ProjectMember.Forbidden", "You must be a Manager to add project members.");

        var existing = await repo.FindAsync(
            m => m.ProjectId == request.ProjectId && m.UserId == request.UserId, cancellationToken);

        if (existing.Count > 0)
            return Error.Conflict("ProjectMember.AlreadyExists", "User is already a member of this project.");

        // ProjectManagers are always assigned Manager role regardless of what was requested
        var systemRole = await users.GetRoleAsync(request.UserId, cancellationToken);
        var role = systemRole == UserRole.ProjectManager ? ProjectMemberRole.Manager : request.Role;

        var member = ProjectMember.Create(request.ProjectId, request.UserId, role);
        await repo.AddAsync(member, cancellationToken);

        // Notify the newly added member
        var project = await projectRepo.GetByIdAsync(request.ProjectId, cancellationToken);
        var projectName = project?.Name ?? "a project";
        var n = Notification.Create(
            userId: request.UserId,
            title: "Added to project",
            body: $"You have been added to \"{projectName}\"",
            type: NotificationType.AddedToProject,
            relatedEntityId: request.ProjectId);
        await notificationRepo.AddAsync(n, cancellationToken);
        await notificationService.NotifyUser(
            request.UserId, "Added to project",
            $"You have been added to \"{projectName}\"",
            NotificationType.AddedToProject, request.ProjectId, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = await repo.GetDtoByIdAsync(member.Id, cancellationToken);
        return dto ?? new ProjectMemberDto
        {
            Id = member.Id, ProjectId = member.ProjectId,
            UserId = member.UserId, Role = member.Role, JoinedAt = member.CreatedAt,
        };
    }
}
```

**Note:** `request.UserId` is already a `string` in `AddProjectMemberCommand` — no conversion needed.

- [ ] **Step 2: Build**

```
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/ProjectMembers/AddProjectMember/AddProjectMemberCommandHandler.cs
git commit -m "feat: notify user when added to project"
```

---

### Task 8: Update frontend icon map in `notification-bell.component.ts`

**Files:**
- Modify: `frontend/libs/layout/feature/src/lib/notification-bell.component.ts`

**Context:** The `iconFor(type: number)` method currently handles types 0–4. We need to add cases for 5 (CommentAdded), 6 (SprintStarted), 7 (SprintCompleted), 8 (AddedToProject).

- [ ] **Step 1: Replace the `iconFor` method**

Find this block in the component class (around line 143):

```ts
  iconFor(type: number): string {
    switch (type) {
      case 0: return 'assignment_ind';
      case 1: return 'block';
      case 2: return 'schedule';
      case 3: return 'reply';
      case 4: return 'warning';
      default: return 'notifications';
    }
  }
```

Replace it with:

```ts
  iconFor(type: number): string {
    switch (type) {
      case 0: return 'assignment_ind';
      case 1: return 'block';
      case 2: return 'schedule';
      case 3: return 'reply';
      case 4: return 'warning';
      case 5: return 'comment';
      case 6: return 'play_circle';
      case 7: return 'check_circle';
      case 8: return 'group_add';
      default: return 'notifications';
    }
  }
```

- [ ] **Step 2: Build the frontend**

Run from `frontend/`:
```
pnpm nx build layout-feature
```
Expected: Build succeeded. If the lib target name differs, run `pnpm nx show project layout-feature` to find the correct target.

- [ ] **Step 3: Commit**

```bash
git add frontend/libs/layout/feature/src/lib/notification-bell.component.ts
git commit -m "feat: add icons for CommentAdded, SprintStarted, SprintCompleted, AddedToProject notifications"
```

---

### Task 9: Smoke test

- [ ] **Step 1: Run the backend**

```
dotnet run --project backend/src/ProjectManagement.WebApi
```

- [ ] **Step 2: Test TaskBlocked push**

Using the UI or Swagger: move a task to Blocked status. Open the notification bell — the notification should appear in real time with a `block` icon.

- [ ] **Step 3: Test comment notification**

Post a comment on a task that has an assignee (different from you). Log in as the assignee in another browser tab — the bell should show a `comment` notification.

- [ ] **Step 4: Test sprint activated notification**

Activate a sprint as a Lead/Manager. Log in as another project member — the bell should show a `play_circle` notification.

- [ ] **Step 5: Test sprint completed notification**

Complete a sprint. Other project members should receive a `check_circle` notification.

- [ ] **Step 6: Test added to project notification**

Add a user to a project as Manager. Log in as that user — the bell should show a `group_add` notification.
