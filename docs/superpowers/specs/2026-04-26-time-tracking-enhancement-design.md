# Time Tracking Enhancement Design

**Date:** 2026-04-26
**Status:** Approved

## Problem

The current time tracking implementation is functional but limited compared to Jira's model:

1. **No subtask time logging** — `TimeLog` has no `SubTaskId`; all hours are attributed to the parent task only.
2. **No subtask estimates** — `SubTask` has no `EstimatedHours` field.
3. **No edit support** — time logs can only be deleted, not corrected.
4. **No subtask attribution in log list** — no way to see which subtask a log entry was for.

## Goal

Extend time tracking toward Jira's model: log time against subtasks (rolling up to the parent task total), add estimated hours per subtask, and allow editing existing log entries. All changes are additive and backward-compatible.

## Approach

**Minimal patch** — extend existing entities and endpoints. No new entities, no new screens. The existing `TotalLoggedHours` computation and progress bar continue working without changes.

Rejected alternatives:
- **Separate `SubTaskTimeLog` entity** — doubles repository surface, breaks existing `TotalLoggedHours` AutoMapper sum, unnecessary complexity.
- **Full Jira reporting tab** — out of scope; a dedicated time tracking tab with filters is a separate feature.

---

## Data Model

### `TimeLog` — add `SubTaskId (Guid?)`

Nullable. When set, the log is attributed to that subtask. `TaskId` is always required and unchanged — the log always belongs to the parent task. `TotalLoggedHours` on `TaskDto` sums all `TimeLog` rows for the task regardless of `SubTaskId`, so roll-up is automatic.

Validation: if `SubTaskId` is provided, it must belong to the `TaskId` on the same log (400 otherwise).

### `SubTask` — add `EstimatedHours (decimal?)`

Nullable so existing subtasks are unaffected. No derived relationship to parent task's `EstimatedHours` — both are independent.

One EF migration with two `ALTER TABLE` statements.

---

## Backend

### Edit time log — `PUT /api/timelogs/{id}`

New endpoint. Updates `Hours`, `Description`, `LoggedDate`. Authorization: only the log's author (`TimeLog.UserId == currentUser.UserId`) may edit; return 403 otherwise. Requires adding `UpdateAsync` to `ITimeLogRepository` and its implementation.

Command: `UpdateTimeLogCommand { Id, Hours, Description, LoggedDate }`

### Subtask estimated hours — extend existing update command

`PUT /api/subtasks/{id}` already exists. Extend `UpdateSubTaskCommand` to accept `EstimatedHours (decimal?)` as an optional field. No new endpoint.

Validation: `EstimatedHours` must be ≥ 0 if provided.

### SubTaskId on create time log — extend `CreateTimeLogCommand`

Add `SubTaskId (Guid?)` to existing `CreateTimeLogCommand`. Validate that the subtask belongs to the task if provided (400 otherwise). No new endpoint.

---

## DTO Changes

### `TimeLogDto`

Add two fields:

```csharp
Guid? SubTaskId
string? SubTaskTitle
```

`SubTaskTitle` is populated via AutoMapper from the navigation property (`TimeLog.SubTask.Title`). When `SubTaskId` is null, both fields are null and the frontend omits the subtask label.

### `SubTaskDto`

Add one field:

```csharp
decimal? EstimatedHours
```

---

## Repository Changes

### `ITimeLogRepository`

Add one method:

```csharp
Task UpdateAsync(TimeLog timeLog, CancellationToken ct = default);
```

Implemented as a standard EF `Update` + `SaveChangesAsync` call (or delegated to `IUnitOfWork` — follow existing pattern in the codebase).

---

## Frontend

### Log time form

Add an optional "Subtask" dropdown populated from the task's subtask list. Selecting a subtask sets `subTaskId` on the request body. Leaving it blank logs against the parent task directly.

### Time log list

- Each row gets a pencil (edit) icon, shown only for logs the current user authored.
- Clicking opens an inline edit form with the same fields: hours, description, date.
- Submits `PUT /api/timelogs/{id}`.
- Add a confirmation step before delete (currently deletes immediately).

### Subtask rows

Add `EstimatedHours` input to the existing subtask inline edit form. Display `Xh estimated` next to the subtask title if set.

### Log row attribution

When a log has a `subTaskId`, show the subtask title as a secondary label on the row:

```
2h — Fixed login redirect · Subtask: Write unit tests
Mar 15, 2026 · Alice
```

---

## Error Handling

| Scenario | Response |
|---|---|
| Edit log — not the author | 403 Forbidden |
| Edit log — log not found | 404 Not Found |
| Create log — SubTaskId doesn't belong to TaskId | 400 Bad Request |
| Create log — SubTaskId not found | 400 Bad Request |
| SubTask EstimatedHours < 0 | 400 Bad Request |

All existing error handling unchanged.

---

## Data Flow

```
User selects subtask in log form → POST /api/timelogs { taskId, subTaskId?, hours, ... }
  → Validate subTaskId belongs to taskId
  → Create TimeLog with SubTaskId set
  → TotalLoggedHours on TaskDto auto-includes new log (existing AutoMapper sum)
  → Frontend log list shows subtask label on the row

User edits existing log → PUT /api/timelogs/{id} { hours, description, loggedDate }
  → Verify author matches current user (403 if not)
  → Update log fields
  → Frontend re-fetches task, updated hours reflected in progress bar
```

---

## Out of Scope

- Remaining estimate field (engineers update remaining time per log)
- Dedicated time tracking tab with filters (user, date range, subtask)
- Deriving parent task estimate from sum of subtask estimates
- Time log history / audit trail
- Sprint-level or project-level time reporting
