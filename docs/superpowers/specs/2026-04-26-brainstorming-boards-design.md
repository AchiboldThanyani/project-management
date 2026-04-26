# Brainstorming Boards — Design Spec

**Date:** 2026-04-26
**Status:** Approved

---

## Overview

Add a per-project brainstorming section where project members can collaboratively plan using a freeform whiteboard. Each project can have multiple named boards backed by Excalidraw, with real-time collaboration via SignalR and persistence to the database.

---

## Data Model

Two additions to the domain layer:

### `ProjectBoard` (new entity)

```csharp
public class ProjectBoard : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; }
    public string Title { get; private set; }
    public string ContentJson { get; private set; }  // Excalidraw JSON blob
    public Guid CreatedById { get; private set; }
}
```

### `Project` (existing — add nav property)

```csharp
public ICollection<ProjectBoard> Boards { get; private set; }
```

**Design decision:** No separate `BoardItem` table. Excalidraw manages its own internal element structure; we store and retrieve the entire JSON blob as a single string. This avoids unnecessary complexity and keeps the persistence layer trivial.

---

## Backend API

### Feature folder: `Features/ProjectBoards/`

| Operation | Type | Endpoint |
|---|---|---|
| `CreateProjectBoard` | Command | `POST /api/projects/{projectId}/boards` |
| `UpdateProjectBoard` | Command | `PUT /api/projects/{projectId}/boards/{boardId}` |
| `DeleteProjectBoard` | Command | `DELETE /api/projects/{projectId}/boards/{boardId}` |
| `GetProjectBoards` | Query | `GET /api/projects/{projectId}/boards` |
| `GetProjectBoard` | Query | `GET /api/projects/{projectId}/boards/{boardId}` |

- `GetProjectBoards` returns a list DTO **without** `ContentJson` (list view doesn't need it).
- `GetProjectBoard` returns the full DTO **with** `ContentJson` (board view needs it to initialise Excalidraw).
- All endpoints are restricted to project members only, using the same authorization guard applied to existing project endpoints.

### Infrastructure

- `IBoardRepository` interface in `Application/Interfaces/`
- `BoardRepository` implementation in `Infrastructure/Repositories/`
- New `ProjectBoardsController` in `WebApi/Controllers/` following existing controller conventions
- EF Core configuration and migration for `ProjectBoards` table

---

## Real-time Collaboration (SignalR)

### New `BoardHub`

A dedicated `BoardHub` is added (separate from the existing notification hub) to keep concerns clean.

#### Client → Server methods

| Method | Payload | Purpose |
|---|---|---|
| `JoinBoard(boardId)` | `Guid boardId` | Subscribe to a board's real-time updates |
| `LeaveBoard(boardId)` | `Guid boardId` | Unsubscribe from a board |
| `BroadcastBoardChange(boardId, contentJson)` | `Guid, string` | Push local canvas changes to other members |

#### Server → Client events

| Event | Payload | Purpose |
|---|---|---|
| `ReceiveBoardChange` | `string contentJson` | Deliver another member's canvas update |

### Collaboration Flow

1. User opens a board → Angular calls `JoinBoard(boardId)` on connect.
2. User draws/edits → Excalidraw fires `onChange` → **500ms debounce** → Angular calls `BroadcastBoardChange(boardId, contentJson)`.
3. `BoardHub` broadcasts `ReceiveBoardChange(contentJson)` to all other clients in the board group (excludes sender).
4. Each receiving client applies the incoming JSON to their local Excalidraw canvas.
5. On a separate **2s debounce** → Angular calls `PUT /api/projects/{projectId}/boards/{boardId}` to persist the canvas to the database.

### Conflict Strategy

Last-write-wins. Because SignalR broadcasts on every change (500ms debounce), canvases stay in sync continuously. The window for a conflict is very small. For a planning board with small teams this is acceptable; CRDT-based merging is the future upgrade path if needed.

---

## Frontend (Angular / Nx)

### New Nx Libraries

```
libs/
  boards/
    data-access/   — BoardService (HTTP calls + SignalR wiring), board signal state
    feature/       — BoardListComponent, BoardDetailComponent (Excalidraw wrapper)
```

Shared board models (interfaces) added to `libs/shared/models/src/lib/`.

### Routing

Boards are nested under projects:

```
/projects/:projectId/boards           → BoardListComponent
/projects/:projectId/boards/:boardId  → BoardDetailComponent
```

A **Boards** link is added to the project sidebar alongside Tasks, Sprints, Members, etc.

### Board List View

```
+---------------------------+
| Project: My App           |
| Boards          [+ New]   |
+---------------------------+
| Sprint 3 Planning    [>]  |
| DB Schema Ideas      [>]  |
| Architecture         [>]  |
+---------------------------+
```

- `[+ New]` opens an inline name input and calls `POST /api/projects/{projectId}/boards`.
- Each row navigates to the board detail on click.

### Board Detail View

```
+------------------------------------------+
| <- Back   "Sprint 3 Planning"   [Rename] |
+------------------------------------------+
|                                          |
|         < Excalidraw Canvas >            |
|    (full screen, toolbar on left)        |
|                                          |
+------------------------------------------+
```

- `BoardDetailComponent` wraps `@excalidraw/excalidraw` via a thin Angular wrapper component.
- On init: load `ContentJson` from API, pass to Excalidraw as `initialData`, connect to `BoardHub`.
- `onChange` handler: 500ms debounce → `BroadcastBoardChange` via SignalR + 2s debounce → REST persist.
- `ReceiveBoardChange` handler: set a `isApplyingRemoteChange` flag to `true`, update Excalidraw canvas with incoming JSON, then reset the flag. The `onChange` handler must check this flag and skip broadcasting when it is set, preventing an infinite broadcast loop.
- On destroy: call `LeaveBoard`, disconnect SignalR.

### Dependency

```
npm install @excalidraw/excalidraw
```

Lazy-loaded in the boards feature module to keep the main bundle clean (~1MB addition isolated to the boards route).

---

## Out of Scope (for now)

- Board-level permissions / private boards
- Board history / undo across sessions
- Cursors showing other users' positions in real-time
- Export to PNG/SVG (Excalidraw has this built-in, available for free)
