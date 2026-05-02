# AI Deep Thinking Toggle — Design Spec

## Goal

Add a persistent "Deep Thinking" toggle to the AI Assistant that switches from the current all-upfront context dump to a two-step tool-use flow where Claude declares which data it needs, the backend fetches only that, then Claude answers.

## Architecture

The feature is a flag (`DeepThinking: bool`) threaded from the frontend toggle → HTTP request → `AskAiQuery` → handler. When `false` (default), the existing code path is completely unchanged. When `true`, the handler executes a two-step Claude CLI loop instead of `BuildContextAsync`.

## Tech Stack

- Backend: .NET 9 / MediatR / `ClaudeCliService` (subprocess)
- Frontend: Angular 20 signals, `localStorage` for persistence

---

## Backend

### `AskAiQuery`

Add one field:

```csharp
public sealed record AskAiQuery(
    string Question,
    Guid? ProjectId = null,
    IReadOnlyList<ChatMessage>? History = null,
    bool DeepThinking = false)
    : IRequest<Result<AiResponse>>;
```

### `AskAiQueryHandler` — tool-use path

When `req.DeepThinking` is `true`, the handler runs this flow instead of `BuildContextAsync`:

**Step 1 — tool selection call**

Send Claude a prompt with:
- A short system description listing the 8 available tools (name + one-line description each)
- The user's question
- Instruction to reply with a JSON array of tool names and nothing else

Example system prompt section:
```
You are a data router. Given the user's question, reply with a JSON array of tool names you need to answer it. Choose only what is necessary.

Available tools:
- get_projects: project names, statuses, start/end dates
- get_task_summary: task counts grouped by status per project
- get_active_sprint: active sprint name, goal, and end date
- get_workload: per-member task breakdown (in-progress, todo, done, blocked, overdue)
- get_overdue_tasks: list of tasks past their due date
- get_blocked_tasks: list of tasks with Blocked status
- get_open_tickets: unresolved customer support tickets
- get_recent_activity: last 20 activity log events

Reply with ONLY a JSON array, e.g. ["get_active_sprint","get_overdue_tasks"]
Question: {question}
```

**Step 2 — parse tool list**

Parse the raw JSON response into `List<string>`. If parsing fails (Claude returned free text), fall back to the standard `BuildContextAsync` path.

**Step 3 — selective data fetch**

`BuildContextAsync` is refactored into 8 independent private async methods:

| Method | Data fetched |
|---|---|
| `FetchProjectsAsync` | project names, statuses, dates |
| `FetchTaskSummaryAsync` | task counts by status |
| `FetchActiveSprintAsync` | active sprint info |
| `FetchWorkloadAsync` | per-member task breakdown |
| `FetchOverdueTasksAsync` | overdue task list |
| `FetchBlockedTasksAsync` | blocked task list |
| `FetchOpenTicketsAsync` | unresolved tickets |
| `FetchRecentActivityAsync` | last 20 activity events |

Only methods whose tool name appears in the parsed list are called. Results are concatenated into a context string.

**Step 4 — answer call**

Same prompt format as today (context + history + question + suggestions instruction), but using only the fetched sections.

### `AskAiRequest` (controller DTO)

```csharp
public record AskAiRequest(
    string Question,
    Guid? ProjectId,
    List<ChatMessage>? History,
    bool DeepThinking = false);
```

Pass `request.DeepThinking` through to `AskAiQuery`.

---

## Frontend

### `ai-assistant.component.ts`

**State:**

```typescript
deepThinking = signal(localStorage.getItem('ai-deep-thinking') === 'true');
```

**Toggle handler:**

```typescript
toggleDeepThinking() {
  const next = !this.deepThinking();
  this.deepThinking.set(next);
  localStorage.setItem('ai-deep-thinking', String(next));
}
```

**UI — toggle chip in `mode-row`, only when `mode() === 'ask'`:**

```html
@if (mode() === 'ask') {
  <button class="mode-chip deep-chip" [class.active]="deepThinking()" (click)="toggleDeepThinking()" title="Deep Thinking — Claude selects only the data it needs">
    <span class="material-icons-round">psychology</span> Deep
  </button>
}
```

The chip sits in the same `mode-row` as Ask/Plan, visually separated by a small divider.

**Loading label:**

When `deepThinking()` is `true`, the loading bubble shows "Analyzing..." instead of "Thinking".

**Request body:**

```typescript
this.aiService.ask({
  question: this.input,
  projectId: this.selectedProjectId ?? undefined,
  history: this.chatHistory(),
  deepThinking: this.deepThinking(),
})
```

### `AiService`

Add `deepThinking?: boolean` to the ask request type and include it in the POST body.

---

## Error handling

If step 1 of the tool-use flow returns unparseable JSON (Claude ignored the instruction), the handler silently falls back to `BuildContextAsync` and completes as normal. No error is surfaced to the user.

---

## What does NOT change

- `IClaudeService` interface — unchanged
- `ClaudeCliService` — unchanged
- Existing `AskAiQueryHandler` default path — unchanged
- Plan mode — unaffected
- All other AI features — unaffected
