# SignalR Notification Completion Design

**Date:** 2026-04-26
**Status:** Approved

## Problem

Four notification events are missing real-time SignalR pushes, and one existing event has a bug:

1. **TaskBlocked** — DB notification is created in `TaskStatusChangedEventHandler` but `NotifyUser()` is never called, so the real-time push never fires.
2. **Comment added** — no notification exists for task assignees or prior commenters when a new comment is posted.
3. **Sprint activated** — project members receive no notification when a sprint goes active.
4. **Sprint completed** — project members receive no notification when a sprint is closed.
5. **Added to project** — new members receive no notification when they are added to a project.

## Goal

Wire all five events so that every affected user receives both a persisted DB notification and a real-time SignalR push atomically within the same handler transaction. Update the frontend icon map to cover the four new notification types.

## Approach

Inline additions to existing command/event handlers — no new handlers, no domain events, no separate commands. Each handler already holds the repositories and services it needs; we add the notification calls after the primary action succeeds but before `SaveChangesAsync`.

Rejected alternatives:
- **Domain events** — carry-over for sprint events requires user input; comment notifications require joining two read models at dispatch time. Inline keeps it simple.
- **Separate `NotificationCommandHandler`** — extra round-trip risk; the spec calls for atomicity.

---

## Backend

### 1. `NotificationType` enum

Add four new values to `NotificationType.cs`:

```csharp
CommentAdded   = 5,
SprintStarted  = 6,
SprintCompleted = 7,
AddedToProject = 8,
```

Existing values (0–4) are unchanged.

### 2. Fix: `TaskStatusChangedEventHandler` — TaskBlocked real-time push

The handler already creates a `Notification` entity for `TaskStatus.Blocked` but never calls `NotifyUser`. Add the missing call immediately after `_unitOfWork.SaveChangesAsync`:

```csharp
await _notificationService.NotifyUser(notification, assigneeId, ct);
```

`INotificationService` and the assignee id are already available in that handler.

### 3. `CreateCommentCommandHandler` — comment notifications

Recipients: the task assignee + all users who have previously commented on the task, deduplicated, excluding the author of the new comment.

Steps inside the handler, after the comment is saved:
1. Load `task.AssigneeId` (already loaded or fetch via `ITaskRepository`).
2. Load existing comment author IDs via `ICommentRepository.GetAuthorIdsByTaskAsync(taskId)`.
3. Union both sets, remove the current user's ID, deduplicate.
4. For each recipient: create a `Notification` entity (type `CommentAdded`, referencing `task.ProjectId` and `taskId`) + call `NotifyUser`.

No new repository methods needed — `ICommentRepository` already returns comments; we extract author IDs from that result.

### 4. `ActivateSprintCommandHandler` — sprint started notification

After the sprint is marked active and `SaveChangesAsync` completes:
1. Load all project member user IDs via `IProjectMemberRepository.GetMemberUserIdsAsync(projectId)`.
2. Exclude the current user (`ICurrentUserService.GetCurrentUserId()`).
3. For each member: create a `Notification` (type `SprintStarted`, message *"Sprint '{name}' has started"*) + call `NotifyUser`.

`IProjectMemberRepository` is already injected into this handler.

### 5. `CompleteSprintCommandHandler` — sprint completed notification

Identical pattern to activate, using type `SprintCompleted` and message *"Sprint '{name}' has been completed"*. The handler already has all required dependencies.

### 6. `AddProjectMemberCommandHandler` — added to project notification

Single recipient: the newly added member.

After `SaveChangesAsync`:
1. Create a `Notification` (type `AddedToProject`, message *"You have been added to project '{name}'"*).
2. Call `NotifyUser` for that member's user ID.

---

## Repository additions

### `IProjectMemberRepository`

Add one method:

```csharp
Task<IReadOnlyList<Guid>> GetMemberUserIdsAsync(Guid projectId, CancellationToken ct = default);
```

Implemented as a simple `Select(m => m.UserId).ToListAsync()` query — no N+1.

### `ICommentRepository`

No new methods needed. Existing `GetByTaskIdAsync` returns full comment entities; author IDs are extracted inline.

---

## Frontend

### `notification-bell.component.ts` — `iconFor()`

Add four cases to the existing switch/if block:

| Type | Value | Icon |
|------|-------|------|
| `CommentAdded` | 5 | `comment` |
| `SprintStarted` | 6 | `play_circle` |
| `SprintCompleted` | 7 | `check_circle` |
| `AddedToProject` | 8 | `group_add` |

---

## Data Flow

```
Event fires (comment posted / sprint activated / sprint completed / member added / task blocked)
  → Handler performs primary action
  → SaveChangesAsync (persists DB notification alongside primary change)
  → NotifyUser() → SignalR hub sends "Notification" event to user-{userId} group
  → Frontend notification-bell receives push, re-fetches or appends notification
  → Bell icon updates; clicking shows correct icon per type
```

---

## Error Handling

| Scenario | Response |
|---|---|
| Assignee is null (unassigned task) | Skip assignee notification; still notify prior commenters |
| No prior commenters | Notify assignee only (or skip entirely if also null) |
| No project members besides activator | No notifications sent; sprint still activates normally |
| `NotifyUser` SignalR call fails | Log and swallow — DB notification already persisted; real-time push is best-effort |

---

## Out of Scope

- Notification preferences / opt-out per user
- Email or push delivery
- Batching / deduplication of bulk sprint notifications (each member gets one)
- Retroactive backfill of missed notifications
