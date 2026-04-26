# Sprint Carry-Over Design

**Date:** 2026-04-26
**Status:** Approved

## Problem

When a sprint is completed, incomplete tasks remain attached to the completed sprint where they are effectively invisible. The handler already counts them and logs the count, but takes no action. PMs have no way to redistribute them without manually editing each task.

## Goal

When a PM completes a sprint, give them a single prompt to choose where incomplete tasks go — either a future sprint in the same project or the backlog — and move them atomically as part of sprint completion.

## Approach

Extend the existing `CompleteSprintCommand` to accept a target sprint (or null for backlog). The handler moves all incomplete tasks in the same transaction that marks the sprint complete. One API call, one atomic operation, no partial-failure risk.

Rejected alternatives:
- **Separate `CarryOverTasksCommand`** — two round-trips, risk of sprint completing without carry-over executing.
- **Domain event** — carry-over requires user input (target sprint), which doesn't fit event-driven well.

---

## Backend

### 1. `CompleteSprintCommand`

Add one optional field:

```csharp
public sealed record CompleteSprintCommand(
    Guid Id,
    string? RetroNotes = null,
    Guid? TargetSprintId = null   // null = move to backlog
) : ICommand<SprintDto>;
```

### 2. `CompleteSprintCommandHandler`

After counting incomplete tasks, bulk-update their `SprintId`:

- If `TargetSprintId` has a value → set `task.SprintId = TargetSprintId`
- If `null` → set `task.SprintId = null` (backlog)

Validation inside the handler:
- If `TargetSprintId` is provided, verify it belongs to the same project and is not completed. Return `SprintErrors.InvalidCarryOverTarget` if not.

Activity log extended: *"completed sprint 'Sprint 2' — 3 tasks moved to Sprint 3"* or *"… 3 tasks moved to backlog"*.

`SprintDto.CarryOverCount` already exists — no change needed.

### 3. New query — `GetFutureSprintsByProject`

Returns sprints for a project where `IsCompleted = false && IsActive = false`, ordered by `StartDate`. Used by the frontend to populate the dropdown.

```
GET /api/sprints/project/{projectId}/future
```

Returns `SprintDto[]` (subset: `id`, `name`, `startDate`, `endDate`).

### 4. `ITaskRepository`

Add:
```csharp
Task BulkUpdateSprintAsync(IEnumerable<Guid> taskIds, Guid? sprintId, CancellationToken ct);
```

Implemented as a single `ExecuteUpdateAsync` EF call — no N+1.

---

## Frontend

### Completion flow (extended)

The "Complete Sprint" action in `project-detail.component.ts` opens a two-step modal:

**Step 1 — Retro notes** *(existing, unchanged)*
- Textarea for retro notes
- "Next" button (or "Complete" if no incomplete tasks)

**Step 2 — Carry-over** *(new, only shown when incomplete task count > 0)*
- Heading: *"N incomplete tasks will be carried over"*
- Dropdown options:
  - "Move to backlog" (always present, default when no future sprints exist)
  - One entry per future sprint: *"Sprint 3 — May 1 → May 14"*
- If no future sprints exist: dropdown hidden, informational text only: *"Tasks will be moved to the backlog."*
- "Complete Sprint" confirm button

### API call

```ts
completeSprint(id: string, payload: { retroNotes?: string; targetSprintId?: string })
```

Single PATCH to existing endpoint with the new `targetSprintId` field.

### Post-completion

- Sprint list refreshes (existing behaviour)
- Snackbar: *"Sprint completed — 3 tasks moved to Sprint 3"* or *"… moved to backlog"*
- If `carryOverCount === 0`, snackbar: *"Sprint completed"*

---

## Data Flow

```
PM clicks "Complete Sprint"
  → modal Step 1: retro notes
  → [if incomplete tasks] modal Step 2: choose target
  → frontend fetches future sprints for dropdown (GET /api/sprints/project/{id}/future)
  → PM confirms
  → PATCH /api/sprints/{id}/complete { retroNotes, targetSprintId }
      → handler validates target sprint ownership
      → bulk-updates task SprintIds
      → marks sprint complete
      → logs activity
      → returns SprintDto with CarryOverCount
  → frontend shows snackbar, refreshes sprint list
```

---

## Error Handling

| Scenario | Response |
|---|---|
| `TargetSprintId` not in same project | 400 `Sprint.InvalidCarryOverTarget` |
| `TargetSprintId` is already completed | 400 `Sprint.InvalidCarryOverTarget` |
| No incomplete tasks | Skips bulk update, completes normally |
| No future sprints | Frontend hides dropdown, `targetSprintId` omitted → backlog |

---

## Out of Scope

- Letting the PM cherry-pick which tasks to carry over (all-or-nothing for now)
- Creating a new sprint from the completion modal
- Carry-over across projects
