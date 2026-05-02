# AI Deep Thinking Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent "Deep Thinking" toggle to the AI Assistant that switches from dumping all data upfront to a two-step flow where Claude selects only the tools it needs.

**Architecture:** Add `bool DeepThinking = false` to `AskAiQuery` and thread it through the controller. When true, the handler runs two sequential `AskAsync` calls: first to get Claude's JSON tool selection, then with only the fetched data to answer. The existing path is completely unchanged when the flag is false.

**Tech Stack:** .NET 9 / MediatR / Angular 20 signals / `ClaudeCliService` (subprocess) / `localStorage`

---

## File Map

| File | Change |
|---|---|
| `backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQuery.cs` | Add `bool DeepThinking = false` |
| `backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQueryHandler.cs` | Refactor `BuildContextAsync` into 8 fetch methods; add tool-use path |
| `backend/src/ProjectManagement.WebApi/Controllers/AiController.cs` | Add `bool DeepThinking` to `AiAskBody` record |
| `frontend/libs/shared/util/src/lib/ai.service.ts` | Add `deepThinking?: boolean` to `ask()` |
| `frontend/libs/layout/feature/src/lib/ai-assistant.component.ts` | Add `deepThinking` signal, toggle UI, update `send()`, update loading label |

---

## Task 1: Thread `DeepThinking` flag through backend

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQuery.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/AiController.cs`

- [ ] **Step 1: Update `AskAiQuery` to include the flag**

Open `backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQuery.cs`.

Replace the entire file with:

```csharp
using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Ai.Ask;

public sealed record AskAiQuery(
    string Question,
    Guid? ProjectId = null,
    IReadOnlyList<ChatMessage>? History = null,
    bool DeepThinking = false)
    : IRequest<Result<AiResponse>>;
```

- [ ] **Step 2: Update `AiAskBody` in the controller to accept the flag**

Open `backend/src/ProjectManagement.WebApi/Controllers/AiController.cs`.

Change the `AiAskBody` record (last line of the file) from:
```csharp
public record AiAskBody(string Question, Guid? ProjectId = null, IReadOnlyList<ChatMessage>? History = null);
```
to:
```csharp
public record AiAskBody(string Question, Guid? ProjectId = null, IReadOnlyList<ChatMessage>? History = null, bool DeepThinking = false);
```

Also update the `Ask` action to pass it through:
```csharp
[HttpPost("ask")]
public async Task<ActionResult<AiResponse>> Ask([FromBody] AiAskBody body, CancellationToken ct)
    => (await mediator.Send(new AskAiQuery(body.Question, body.ProjectId, body.History, body.DeepThinking), ct)).ToActionResult(this);
```

- [ ] **Step 3: Build to verify no errors**

```bash
cd backend && dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj
```

Expected: `Build succeeded` with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQuery.cs
git add backend/src/ProjectManagement.WebApi/Controllers/AiController.cs
git commit -m "feat: add DeepThinking flag to AskAiQuery and controller"
```

---

## Task 2: Refactor handler — split `BuildContextAsync` into 8 fetch methods

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQueryHandler.cs`

The goal here is to break `BuildContextAsync` into 8 private methods so each can be called individually. The existing `BuildContextAsync` will call all 8 in sequence to preserve the current behaviour. No behaviour change yet — just restructuring.

- [ ] **Step 1: Replace `AskAiQueryHandler.cs` with the refactored version**

Replace the entire file with:

```csharp
using System.Text;
using System.Text.RegularExpressions;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using DomainTaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Ai.Ask;

internal sealed class AskAiQueryHandler(
    IClaudeService claude,
    IProjectRepository projects,
    ITaskRepository tasks,
    ISprintRepository sprints,
    IUserRepository users,
    IActivityRepository activity,
    ITicketRepository tickets)
    : IRequestHandler<AskAiQuery, Result<AiResponse>>
{
    private static readonly Regex SuggestionsRegex =
        new(@"\[SUGGESTIONS:\s*(.+?)\]\s*$", RegexOptions.Singleline | RegexOptions.Compiled);

    public async Task<Result<AiResponse>> Handle(AskAiQuery req, CancellationToken ct)
    {
        string context;

        if (req.DeepThinking)
            context = await BuildContextWithToolsAsync(req.Question, req.ProjectId, ct);
        else
            context = await BuildContextAsync(req.ProjectId, ct);

        var sb = new StringBuilder(context);
        sb.AppendLine();

        if (req.History is { Count: > 0 })
        {
            sb.AppendLine("=== CONVERSATION HISTORY ===");
            foreach (var msg in req.History)
                sb.AppendLine($"[{(msg.Role == "user" ? "User" : "Assistant")}]: {msg.Content}");
            sb.AppendLine();
        }

        sb.AppendLine("---");
        sb.AppendLine($"Current question: {req.Question}");
        sb.AppendLine();
        sb.AppendLine("After your response, on a new line append exactly (no extra text after):");
        sb.AppendLine("[SUGGESTIONS: First follow-up question | Second follow-up question | Third follow-up question]");
        sb.AppendLine("Keep each suggestion under 60 characters and make them specific to your response.");

        var raw = await claude.AskAsync(sb.ToString(), ct);
        return Result<AiResponse>.Success(ParseResponse(raw));
    }

    // ── Tool-use path ────────────────────────────────────────────────────────

    private async Task<string> BuildContextWithToolsAsync(string question, Guid? projectId, CancellationToken ct)
    {
        var toolSelectionPrompt = $"""
            You are a data router for a project management system.
            Given the user's question, reply with ONLY a JSON array of tool names you need to answer it.
            Choose the minimum set necessary. Do not include tools that are not needed.

            Available tools:
            - get_projects: project names, statuses, start/end dates
            - get_task_summary: task counts grouped by status per project
            - get_active_sprint: active sprint name, goal, and end date
            - get_workload: per-member task breakdown (in-progress, todo, done, blocked, overdue counts + active task titles)
            - get_overdue_tasks: list of tasks past their due date with assignee and priority
            - get_blocked_tasks: list of tasks with Blocked status and assignees
            - get_open_tickets: unresolved customer support tickets grouped by priority
            - get_recent_activity: last 20 activity log events

            Reply with ONLY a JSON array, nothing else. Example: ["get_active_sprint","get_overdue_tasks"]

            Question: {question}
            """;

        var toolJson = await claude.AskAsync(toolSelectionPrompt, ct);

        List<string> selectedTools;
        try
        {
            // Strip markdown code fences if present
            var cleaned = toolJson.Trim().TrimStart('`').TrimEnd('`');
            if (cleaned.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                cleaned = cleaned[4..].Trim();

            selectedTools = System.Text.Json.JsonSerializer.Deserialize<List<string>>(cleaned) ?? [];
        }
        catch
        {
            // Claude didn't return valid JSON — fall back to full context
            return await BuildContextAsync(projectId, ct);
        }

        if (selectedTools.Count == 0)
            return await BuildContextAsync(projectId, ct);

        // Load projects once — shared across fetch methods
        var allProjects = projectId.HasValue
            ? new[] { await projects.GetByIdAsync(projectId.Value, ct) }.Where(p => p != null).Select(p => p!).ToList()
            : (await projects.GetAllAsync(ct)).ToList();

        if (!allProjects.Any())
            return "You are an AI assistant for ProjectHub. No projects found.\n";

        var sb = new StringBuilder();
        sb.AppendLine("You are an AI assistant embedded in a project management system called ProjectHub.");
        sb.AppendLine("Answer questions based strictly on the live data provided below. Be concise, specific, and actionable.");
        sb.AppendLine("When referencing people, use their names. When referencing tasks, include the title and status.");
        sb.AppendLine();
        sb.AppendLine("=== LIVE PROJECT DATA ===");
        sb.AppendLine();

        // Load tasks only if any task-related tool is requested
        List<ProjectManagement.Domain.Entities.ProjectTask> allTasks = [];
        Dictionary<string, string> nameMap = [];

        var needsTasks = selectedTools.Any(t => t is "get_task_summary" or "get_workload" or "get_overdue_tasks" or "get_blocked_tasks");
        if (needsTasks)
        {
            foreach (var project in allProjects)
            {
                var projectTasks = await tasks.FindAsync(t => t.ProjectId == project.Id, ct);
                allTasks.AddRange(projectTasks);
            }

            var userIds = allTasks
                .SelectMany(t => t.Assignees.Select(a => a.UserId).Append(t.ReporterId))
                .Distinct()
                .ToList();

            nameMap = userIds.Count > 0
                ? await users.GetNamesByIdsAsync(userIds!, ct)
                : new Dictionary<string, string>();
        }

        string Name(string? id) => id != null && nameMap.TryGetValue(id, out var n) ? n : (id ?? "Unassigned");

        foreach (var project in allProjects)
        {
            sb.AppendLine($"## Project: {project.Name}");

            if (selectedTools.Contains("get_projects"))
            {
                sb.AppendLine($"   Status: {project.Status}");
                if (project.StartDate.HasValue) sb.AppendLine($"   Started: {project.StartDate:yyyy-MM-dd}");
                if (project.EndDate.HasValue) sb.AppendLine($"   Deadline: {project.EndDate:yyyy-MM-dd}");
                sb.AppendLine();
            }

            if (selectedTools.Contains("get_active_sprint"))
                sb.Append(await FetchActiveSprintAsync(project.Id, ct));

            var projectTasks = allTasks.Where(t => t.ProjectId == project.Id).ToList();

            if (selectedTools.Contains("get_task_summary"))
                sb.Append(FetchTaskSummary(projectTasks));

            if (selectedTools.Contains("get_workload"))
                sb.Append(FetchWorkload(projectTasks, Name));

            if (selectedTools.Contains("get_overdue_tasks"))
                sb.Append(FetchOverdueTasks(projectTasks));

            if (selectedTools.Contains("get_blocked_tasks"))
                sb.Append(FetchBlockedTasks(projectTasks));

            if (selectedTools.Contains("get_open_tickets"))
                sb.Append(await FetchOpenTicketsAsync(project.Id, ct));
        }

        if (selectedTools.Contains("get_recent_activity"))
            sb.Append(await FetchRecentActivityAsync(ct));

        return sb.ToString();
    }

    // ── Standard (full-context) path ─────────────────────────────────────────

    private async Task<string> BuildContextAsync(Guid? projectId, CancellationToken ct)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an AI assistant embedded in a project management system called ProjectHub.");
        sb.AppendLine("Answer questions based strictly on the live data provided below. Be concise, specific, and actionable.");
        sb.AppendLine("When referencing people, use their names. When referencing tasks, include the title and status.");
        sb.AppendLine();
        sb.AppendLine("=== LIVE PROJECT DATA ===");
        sb.AppendLine();

        var allProjects = projectId.HasValue
            ? new[] { await projects.GetByIdAsync(projectId.Value, ct) }.Where(p => p != null).Select(p => p!).ToList()
            : (await projects.GetAllAsync(ct)).ToList();

        if (!allProjects.Any())
        {
            sb.AppendLine("No projects found.");
            return sb.ToString();
        }

        var allTasks = new List<ProjectManagement.Domain.Entities.ProjectTask>();
        foreach (var project in allProjects)
        {
            var projectTasks = await tasks.FindAsync(t => t.ProjectId == project.Id, ct);
            allTasks.AddRange(projectTasks);
        }

        var userIds = allTasks
            .SelectMany(t => t.Assignees.Select(a => a.UserId).Append(t.ReporterId))
            .Distinct()
            .ToList();

        var nameMap = userIds.Count > 0
            ? await users.GetNamesByIdsAsync(userIds!, ct)
            : new Dictionary<string, string>();

        string Name(string? id) => id != null && nameMap.TryGetValue(id, out var n) ? n : (id ?? "Unassigned");

        foreach (var project in allProjects)
        {
            sb.AppendLine($"## Project: {project.Name}");
            sb.AppendLine($"   Status: {project.Status}");
            if (project.StartDate.HasValue) sb.AppendLine($"   Started: {project.StartDate:yyyy-MM-dd}");
            if (project.EndDate.HasValue) sb.AppendLine($"   Deadline: {project.EndDate:yyyy-MM-dd}");
            sb.AppendLine();

            sb.Append(await FetchActiveSprintAsync(project.Id, ct));

            var projectTasks = allTasks.Where(t => t.ProjectId == project.Id).ToList();

            sb.Append(FetchTaskSummary(projectTasks));
            sb.Append(FetchWorkload(projectTasks, Name));
            sb.Append(FetchOverdueTasks(projectTasks));
            sb.Append(FetchBlockedTasks(projectTasks));
            sb.Append(await FetchOpenTicketsAsync(project.Id, ct));
        }

        sb.Append(await FetchRecentActivityAsync(ct));

        return sb.ToString();
    }

    // ── Individual fetch methods ─────────────────────────────────────────────

    private async Task<string> FetchActiveSprintAsync(Guid projectId, CancellationToken ct)
    {
        var activeSprint = await sprints.GetActiveSprintForProjectAsync(projectId, ct);
        if (activeSprint == null) return string.Empty;
        var sb = new StringBuilder();
        sb.AppendLine($"   Active Sprint: {activeSprint.Name}");
        if (!string.IsNullOrWhiteSpace(activeSprint.Goal))
            sb.AppendLine($"   Sprint Goal: {activeSprint.Goal}");
        sb.AppendLine($"   Sprint Ends: {activeSprint.EndDate:yyyy-MM-dd}");
        sb.AppendLine();
        return sb.ToString();
    }

    private static string FetchTaskSummary(List<ProjectManagement.Domain.Entities.ProjectTask> projectTasks)
    {
        var sb = new StringBuilder();
        var byStatus = projectTasks.GroupBy(t => t.Status).ToDictionary(g => g.Key, g => g.Count());
        sb.AppendLine("   Task Summary:");
        foreach (var (status, count) in byStatus.OrderBy(x => x.Key))
            sb.AppendLine($"     {status}: {count}");
        sb.AppendLine();
        return sb.ToString();
    }

    private static string FetchWorkload(List<ProjectManagement.Domain.Entities.ProjectTask> projectTasks, Func<string?, string> name)
    {
        var assignedPairs = projectTasks.SelectMany(t => t.Assignees.Select(a => (Task: t, UserId: a.UserId))).ToList();
        if (!assignedPairs.Any()) return string.Empty;
        var sb = new StringBuilder();
        sb.AppendLine("   Workload by Team Member:");
        foreach (var group in assignedPairs.GroupBy(x => x.UserId))
        {
            var memberName = name(group.Key);
            var taskList = group.Select(x => x.Task).ToList();
            var inProgress = taskList.Count(t => t.Status == DomainTaskStatus.InProgress);
            var done = taskList.Count(t => t.Status == DomainTaskStatus.Done);
            var todo = taskList.Count(t => t.Status == DomainTaskStatus.Todo);
            var blocked = taskList.Count(t => t.Status == DomainTaskStatus.Blocked);
            var overdue = taskList.Count(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != DomainTaskStatus.Done && t.Status != DomainTaskStatus.Cancelled);
            sb.AppendLine($"     {memberName}: {inProgress} in progress, {todo} todo, {done} done, {blocked} blocked{(overdue > 0 ? $", {overdue} OVERDUE" : "")}");
            foreach (var task in taskList.Where(t => t.Status is DomainTaskStatus.InProgress or DomainTaskStatus.Blocked).Take(5))
                sb.AppendLine($"       - [{task.Status}] {task.Title} (Priority: {task.Priority}{(task.DueDate.HasValue ? $", Due: {task.DueDate:yyyy-MM-dd}" : "")})");
        }
        sb.AppendLine();
        return sb.ToString();
    }

    private static string FetchOverdueTasks(List<ProjectManagement.Domain.Entities.ProjectTask> projectTasks)
    {
        var overdueTasks = projectTasks
            .Where(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != DomainTaskStatus.Done && t.Status != DomainTaskStatus.Cancelled)
            .OrderByDescending(t => t.Priority)
            .ToList();
        if (!overdueTasks.Any()) return string.Empty;
        var sb = new StringBuilder();
        sb.AppendLine($"   Overdue Tasks ({overdueTasks.Count}):");
        foreach (var t in overdueTasks.Take(10))
        {
            var assignees = t.Assignees.Any() ? string.Join(", ", t.Assignees.Select(a => a.FullName)) : "Unassigned";
            sb.AppendLine($"     - {t.Title} | Assigned: {assignees} | Priority: {t.Priority} | Due: {t.DueDate:yyyy-MM-dd}");
        }
        sb.AppendLine();
        return sb.ToString();
    }

    private static string FetchBlockedTasks(List<ProjectManagement.Domain.Entities.ProjectTask> projectTasks)
    {
        var blockedTasks = projectTasks.Where(t => t.Status == DomainTaskStatus.Blocked).ToList();
        if (!blockedTasks.Any()) return string.Empty;
        var sb = new StringBuilder();
        sb.AppendLine($"   Blocked Tasks ({blockedTasks.Count}):");
        foreach (var t in blockedTasks)
        {
            var assignees = t.Assignees.Any() ? string.Join(", ", t.Assignees.Select(a => a.FullName)) : "Unassigned";
            sb.AppendLine($"     - {t.Title} | Assigned: {assignees}");
        }
        sb.AppendLine();
        return sb.ToString();
    }

    private async Task<string> FetchOpenTicketsAsync(Guid projectId, CancellationToken ct)
    {
        var openTickets = await tickets.GetByProjectAsync(projectId, null, ct);
        var unresolvedTickets = openTickets.Where(t => t.Status != TicketStatus.Resolved && t.Status != TicketStatus.Closed).ToList();
        if (!unresolvedTickets.Any()) return string.Empty;
        var sb = new StringBuilder();
        sb.AppendLine($"   Customer Tickets (open/unresolved): {unresolvedTickets.Count}");
        var critical = unresolvedTickets.Where(t => t.Priority == TaskPriority.Critical || t.Priority == TaskPriority.High).ToList();
        if (critical.Any())
        {
            sb.AppendLine("   High/Critical tickets:");
            foreach (var t in critical.Take(5))
                sb.AppendLine($"     - [{t.Status}] {t.Subject} (Priority: {t.Priority})");
        }
        sb.AppendLine();
        return sb.ToString();
    }

    private async Task<string> FetchRecentActivityAsync(CancellationToken ct)
    {
        var recentActivity = await activity.GetRecentAsync(20, ct);
        if (!recentActivity.Any()) return string.Empty;
        var sb = new StringBuilder();
        sb.AppendLine("=== RECENT ACTIVITY (last 20 events) ===");
        foreach (var log in recentActivity)
            sb.AppendLine($"  [{log.CreatedAt:MM-dd HH:mm}] {log.UserName} {log.Action} {log.EntityType}: {log.EntityName}");
        sb.AppendLine();
        return sb.ToString();
    }

    // ── Shared response parser ───────────────────────────────────────────────

    private static AiResponse ParseResponse(string raw)
    {
        var suggestions = new List<string>();
        var match = SuggestionsRegex.Match(raw);
        if (match.Success)
        {
            suggestions = match.Groups[1].Value
                .Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Take(3)
                .ToList();
            raw = SuggestionsRegex.Replace(raw, "").TrimEnd();
        }
        return new AiResponse(raw, suggestions);
    }
}
```

- [ ] **Step 2: Build to verify no compile errors**

```bash
cd backend && dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj
```

Expected: `Build succeeded` with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Ai/Ask/AskAiQueryHandler.cs
git commit -m "refactor: split BuildContextAsync into individual fetch methods; add tool-use path"
```

---

## Task 3: Update `AiService` on the frontend

**Files:**
- Modify: `frontend/libs/shared/util/src/lib/ai.service.ts`

- [ ] **Step 1: Update the `ask()` signature and request body**

Replace the `ask` method (lines 22–24) with:

```typescript
ask(question: string, projectId?: string, history: ChatMessage[] = [], deepThinking = false): Observable<AiResponse> {
  return this.http.post<AiResponse>(this.base + '/ask', { question, projectId, history, deepThinking });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/libs/shared/util/src/lib/ai.service.ts
git commit -m "feat: pass deepThinking flag in AI ask request"
```

---

## Task 4: Add deep thinking toggle to the AI assistant component

**Files:**
- Modify: `frontend/libs/layout/feature/src/lib/ai-assistant.component.ts`

There are three changes: add the signal (class), add the toggle chip (template), update the `send()` call and loading label.

- [ ] **Step 1: Add the `deepThinking` signal to the component class**

Find this block in the class (around line 843):

```typescript
open        = signal(false);
loading     = signal(false);
messages    = signal<Message[]>([]);
projects    = signal<Project[]>([]);
suggestions = signal<string[]>([]);
input       = '';
focused     = false;
```

Replace it with:

```typescript
open          = signal(false);
loading       = signal(false);
deepThinking  = signal(localStorage.getItem('ai-deep-thinking') === 'true');
messages      = signal<Message[]>([]);
projects      = signal<Project[]>([]);
suggestions   = signal<string[]>([]);
input         = '';
focused       = false;
```

- [ ] **Step 2: Add `toggleDeepThinking()` method**

Add this method directly after the `sendQuick` method (around line 1031):

```typescript
toggleDeepThinking() {
  const next = !this.deepThinking();
  this.deepThinking.set(next);
  localStorage.setItem('ai-deep-thinking', String(next));
}
```

- [ ] **Step 3: Add the "Deep" toggle chip to the template**

Find the `mode-row` block in the template (around line 68–77):

```html
@if (canUsePlanMode()) {
  <div class="mode-row">
    <button class="mode-chip" [class.active]="mode() === 'ask'" (click)="switchMode('ask')">
      <span class="material-icons-round">chat</span> Ask
    </button>
    <button class="mode-chip" [class.active]="mode() === 'plan'" (click)="switchMode('plan')">
      <span class="material-icons-round">auto_fix_high</span> Plan
    </button>
  </div>
}
```

Replace with:

```html
@if (canUsePlanMode()) {
  <div class="mode-row">
    <button class="mode-chip" [class.active]="mode() === 'ask'" (click)="switchMode('ask')">
      <span class="material-icons-round">chat</span> Ask
    </button>
    <button class="mode-chip" [class.active]="mode() === 'plan'" (click)="switchMode('plan')">
      <span class="material-icons-round">auto_fix_high</span> Plan
    </button>
    @if (mode() === 'ask') {
      <span class="mode-divider"></span>
      <button class="mode-chip deep-chip" [class.active]="deepThinking()" (click)="toggleDeepThinking()" title="Deep Thinking — Claude selects only the data it needs">
        <span class="material-icons-round">psychology</span> Deep
      </button>
    }
  </div>
}
```

- [ ] **Step 4: Update the loading label to say "Analyzing..." when deep thinking is on**

Find the thinking label in the template (around line 130–133):

```html
<div class="thinking-label">
  <span class="thinking-dot"></span>
  Thinking
</div>
```

Replace with:

```html
<div class="thinking-label">
  <span class="thinking-dot"></span>
  {{ deepThinking() ? 'Analyzing...' : 'Thinking' }}
</div>
```

- [ ] **Step 5: Pass `deepThinking` in the `send()` call**

Find the `aiSvc.ask(...)` call (around line 1051):

```typescript
this.aiSvc.ask(text, this.selectedProjectId ?? undefined, history).subscribe({
```

Replace with:

```typescript
this.aiSvc.ask(text, this.selectedProjectId ?? undefined, history, this.deepThinking()).subscribe({
```

- [ ] **Step 6: Add CSS for the divider and deep chip**

Find the `.mode-chip` CSS block in the component styles and add after it:

```css
.mode-divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 2px;
  align-self: center;
}
.deep-chip.active {
  background: var(--violet-mid);
  color: var(--violet);
  border-color: var(--violet);
}
```

- [ ] **Step 7: Build the frontend to verify no errors**

```bash
cd frontend && npx nx build project-management --configuration=development
```

Expected: Build completes with 0 errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/libs/layout/feature/src/lib/ai-assistant.component.ts
git add frontend/libs/shared/util/src/lib/ai.service.ts
git commit -m "feat: add persistent deep thinking toggle to AI assistant"
```

---

## Manual verification

1. Start backend: `cd backend && dotnet run --project src/ProjectManagement.WebApi`
2. Start frontend: `cd frontend && npx nx serve project-management`
3. Open the AI assistant panel
4. **Without Deep Thinking:** send a question — verify it responds normally, toggle chip is off
5. **Toggle Deep Thinking on:** chip turns violet, label says "Analyzing..." during loading
6. Send the same question — verify it still returns a coherent answer
7. Close and reopen the panel — toggle should still be on (localStorage persistence)
8. Reload the page — toggle should still be on
