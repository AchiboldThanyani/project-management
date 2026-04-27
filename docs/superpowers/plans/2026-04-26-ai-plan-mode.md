# AI Plan Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a conversational AI Plan Mode to the existing AI assistant panel, allowing Project Managers and Admins to spec out new projects or plan features and apply the result as backlog tasks.

**Architecture:** Three-phase backend flow (Clarifying → Generating → Extracting) handled by a stateless `PlanConversationQuery` + two apply commands (`CreateProjectWithPlanCommand`, `AddPlanTasksCommand`). The frontend adds a mode toggle to `AiAssistantComponent`, drives the conversation loop, and shows a task checklist confirmation panel before applying.

**Tech Stack:** .NET 9, MediatR, xUnit; Angular 20 with Signals, `AiService`, `AuthService`

---

## File Map

**Create:**
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanConversationMessage.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanConversationPhase.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanTaskItem.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanConversationResponse.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/Conversation/PlanConversationQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/Conversation/PlanConversationQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/CreateProjectWithPlan/CreateProjectWithPlanCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/CreateProjectWithPlan/CreateProjectWithPlanCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/AddPlanTasks/AddPlanTasksCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Ai/Plan/AddPlanTasks/AddPlanTasksCommandHandler.cs`
- `backend/tests/ProjectManagement.Application.Tests/Ai/Plan/TaskExtractionTests.cs`
- `backend/tests/ProjectManagement.Application.Tests/Ai/Plan/PlanConversationHandlerRoleTests.cs`

**Modify:**
- `backend/src/ProjectManagement.WebApi/Controllers/AiController.cs`
- `backend/src/ProjectManagement.WebApi/Controllers/ProjectsController.cs`
- `frontend/libs/shared/util/src/lib/ai.service.ts`
- `frontend/libs/layout/feature/src/lib/ai-assistant.component.ts`

---

## Task 1: Plan shared types

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanConversationMessage.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanConversationPhase.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanTaskItem.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/PlanConversationResponse.cs`

- [ ] **Step 1: Create PlanConversationMessage.cs**

```csharp
namespace ProjectManagement.Application.Features.Ai.Plan;

public sealed record PlanConversationMessage(string Role, string Content);
```

- [ ] **Step 2: Create PlanConversationPhase.cs**

```csharp
namespace ProjectManagement.Application.Features.Ai.Plan;

public enum PlanConversationPhase
{
    Clarifying,
    Generating,
    Extracting,
}
```

- [ ] **Step 3: Create PlanTaskItem.cs**

```csharp
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Ai.Plan;

public sealed record PlanTaskItem(string Title, string Description, TaskPriority Priority);
```

- [ ] **Step 4: Create PlanConversationResponse.cs**

```csharp
namespace ProjectManagement.Application.Features.Ai.Plan;

public sealed record PlanConversationResponse(
    string? Response,
    IReadOnlyList<PlanTaskItem>? Tasks);
```

- [ ] **Step 5: Build to verify no errors**

```bash
cd backend && dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj -c Debug --nologo -q
```

Expected: `Build succeeded.`

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Ai/Plan/
git commit -m "feat: add AI Plan Mode shared types (PlanTaskItem, PlanConversationMessage, PlanConversationPhase, PlanConversationResponse)"
```

---

## Task 2: PlanConversationQueryHandler with task extraction

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/Conversation/PlanConversationQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/Conversation/PlanConversationQueryHandler.cs`
- Test: `backend/tests/ProjectManagement.Application.Tests/Ai/Plan/TaskExtractionTests.cs`
- Test: `backend/tests/ProjectManagement.Application.Tests/Ai/Plan/PlanConversationHandlerRoleTests.cs`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/ProjectManagement.Application.Tests/Ai/Plan/TaskExtractionTests.cs`:

```csharp
using ProjectManagement.Application.Features.Ai.Plan.Conversation;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Tests.Ai.Plan;

public class TaskExtractionTests
{
    [Fact]
    public void ExtractTasks_ValidJson_ReturnsAllTasks()
    {
        var raw = """
            ```json
            [
              {"title":"Set up repo","description":"Initialize git","priority":"High"},
              {"title":"Design DB","description":"ERD design","priority":"Medium"}
            ]
            ```
            """;

        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);

        Assert.Equal(2, tasks.Count);
        Assert.Equal("Set up repo", tasks[0].Title);
        Assert.Equal(TaskPriority.High, tasks[0].Priority);
        Assert.Equal("Design DB", tasks[1].Title);
        Assert.Equal(TaskPriority.Medium, tasks[1].Priority);
    }

    [Fact]
    public void ExtractTasks_NoFence_ReturnsEmpty()
    {
        var tasks = PlanConversationQueryHandler.ExtractTasks("No JSON here at all.");
        Assert.Empty(tasks);
    }

    [Fact]
    public void ExtractTasks_MalformedJson_ReturnsEmpty()
    {
        var raw = "```json\nnot valid json\n```";
        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);
        Assert.Empty(tasks);
    }

    [Fact]
    public void ExtractTasks_PartiallyMalformed_SkipsBadItems()
    {
        var raw = """
            ```json
            [
              {"title":"Good task","description":"desc","priority":"Low"},
              {"missing_title":true},
              {"title":"Another good","description":"desc2","priority":"High"}
            ]
            ```
            """;

        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);

        Assert.Equal(2, tasks.Count);
        Assert.Equal("Good task", tasks[0].Title);
        Assert.Equal("Another good", tasks[1].Title);
    }

    [Fact]
    public void ExtractTasks_UnknownPriority_SkipsItem()
    {
        var raw = """
            ```json
            [{"title":"Task","description":"desc","priority":"Critical"}]
            ```
            """;

        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);
        Assert.Empty(tasks);
    }
}
```

Create `backend/tests/ProjectManagement.Application.Tests/Ai/Plan/PlanConversationHandlerRoleTests.cs`:

```csharp
using ProjectManagement.Application.Features.Ai.Plan;
using ProjectManagement.Application.Features.Ai.Plan.Conversation;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Tests.Ai.Plan;

public class PlanConversationHandlerRoleTests
{
    private sealed class FakeClaude : IClaudeService
    {
        public string ReturnValue { get; set; } = "response";
        public Task<string> AskAsync(string prompt, CancellationToken ct = default)
            => Task.FromResult(ReturnValue);
    }

    private sealed class FakeUser : ICurrentUserService
    {
        public string UserId { get; set; } = "u1";
        public string FullName { get; set; } = "Test User";
        public bool IsAdmin { get; set; }
        public bool IsProjectManager { get; set; }
    }

    [Fact]
    public async Task Handle_NonPmNonAdmin_ReturnsForbidden()
    {
        var handler = new PlanConversationQueryHandler(new FakeClaude(), new FakeUser { IsProjectManager = false, IsAdmin = false });
        var query = new PlanConversationQuery([], "hello", PlanConversationPhase.Clarifying);

        var result = await handler.Handle(query, default);

        Assert.False(result.IsSuccess);
        Assert.Equal("Forbidden", result.Error!.Type.ToString());
    }

    [Fact]
    public async Task Handle_ProjectManager_ReturnsResponse()
    {
        var claude = new FakeClaude { ReturnValue = "What is the target user?" };
        var handler = new PlanConversationQueryHandler(claude, new FakeUser { IsProjectManager = true });
        var query = new PlanConversationQuery([], "I want a time tracker", PlanConversationPhase.Clarifying);

        var result = await handler.Handle(query, default);

        Assert.True(result.IsSuccess);
        Assert.Equal("What is the target user?", result.Value!.Response);
        Assert.Null(result.Value.Tasks);
    }

    [Fact]
    public async Task Handle_ExtractingPhase_ReturnsParsedTasks()
    {
        var raw = """
            ```json
            [{"title":"Setup","description":"desc","priority":"High"}]
            ```
            """;
        var claude = new FakeClaude { ReturnValue = raw };
        var handler = new PlanConversationQueryHandler(claude, new FakeUser { IsProjectManager = true });
        var spec = "# My Project\nDescription.";
        var query = new PlanConversationQuery([], spec, PlanConversationPhase.Extracting);

        var result = await handler.Handle(query, default);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value!.Response);
        Assert.Single(result.Value.Tasks!);
        Assert.Equal("Setup", result.Value.Tasks![0].Title);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --filter "FullyQualifiedName~Ai.Plan" --nologo -q 2>&1 | head -20
```

Expected: compilation errors about missing `PlanConversationQueryHandler`.

- [ ] **Step 3: Create PlanConversationQuery.cs**

```csharp
using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Ai.Plan.Conversation;

public sealed record PlanConversationQuery(
    IReadOnlyList<PlanConversationMessage> History,
    string NewMessage,
    PlanConversationPhase Phase)
    : IRequest<Result<PlanConversationResponse>>;
```

- [ ] **Step 4: Create PlanConversationQueryHandler.cs**

```csharp
using System.Text;
using System.Text.Json;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Ai.Plan.Conversation;

internal sealed class PlanConversationQueryHandler(
    IClaudeService claude,
    ICurrentUserService currentUser)
    : IRequestHandler<PlanConversationQuery, Result<PlanConversationResponse>>
{
    private const string ClarifyingSystemPrompt =
        """
        You are a project planning assistant inside a project management tool called ProjectHub.
        Help the Project Manager define a clear project or feature plan.
        Ask ONE focused clarifying question per turn. Cover: scope boundaries, target users, key constraints, success criteria, and estimated size.
        Do NOT generate a task list or spec until the user explicitly asks or types "generate".
        Keep responses short and conversational.
        """;

    private const string GenerationInstruction =
        "Now generate a comprehensive markdown project spec based on our conversation. Start with an H1 title, then a brief description paragraph, then key goals, scope, and any constraints we discussed.";

    private const string ExtractionInstruction =
        """
        Convert the project spec above into a JSON task list.
        Output ONLY a fenced JSON code block — no text before or after it.
        Each task must have exactly these fields: "title" (string), "description" (string), "priority" ("Low", "Medium", or "High").
        Aim for 5–15 tasks that cover the full scope.

        ```json
        [...]
        ```
        """;

    public async Task<Result<PlanConversationResponse>> Handle(PlanConversationQuery req, CancellationToken ct)
    {
        if (!currentUser.IsProjectManager && !currentUser.IsAdmin)
            return Error.Forbidden("Plan.Forbidden", "Only Project Managers and Admins can use Plan Mode.");

        var prompt = BuildPrompt(req);
        var raw = await claude.AskAsync(prompt, ct);

        if (req.Phase == PlanConversationPhase.Extracting)
        {
            var tasks = ExtractTasks(raw);
            return new PlanConversationResponse(null, tasks);
        }

        return new PlanConversationResponse(raw, null);
    }

    private static string BuildPrompt(PlanConversationQuery req)
    {
        var sb = new StringBuilder();

        if (req.Phase == PlanConversationPhase.Extracting)
        {
            sb.AppendLine(req.NewMessage);
            sb.AppendLine();
            sb.AppendLine(ExtractionInstruction);
            return sb.ToString();
        }

        sb.AppendLine(ClarifyingSystemPrompt);
        sb.AppendLine();

        foreach (var msg in req.History)
            sb.AppendLine($"[{(msg.Role == "user" ? "User" : "Assistant")}]: {msg.Content}");

        if (req.History.Count > 0)
            sb.AppendLine();

        sb.AppendLine(req.Phase == PlanConversationPhase.Generating
            ? GenerationInstruction
            : $"User: {req.NewMessage}");

        return sb.ToString();
    }

    public static List<PlanTaskItem> ExtractTasks(string rawResponse)
    {
        var fenceStart = rawResponse.IndexOf("```json", StringComparison.OrdinalIgnoreCase);
        if (fenceStart == -1) return [];

        var lineBreak = rawResponse.IndexOf('\n', fenceStart);
        if (lineBreak == -1) return [];
        var contentStart = lineBreak + 1;

        var fenceEnd = rawResponse.IndexOf("```", contentStart);
        if (fenceEnd == -1 || contentStart >= fenceEnd) return [];

        var json = rawResponse[contentStart..fenceEnd].Trim();

        try
        {
            var elements = JsonSerializer.Deserialize<List<JsonElement>>(json);
            if (elements == null) return [];

            var result = new List<PlanTaskItem>();
            foreach (var el in elements)
            {
                try
                {
                    var title = el.GetProperty("title").GetString();
                    var desc = el.GetProperty("description").GetString();
                    var priorityStr = el.GetProperty("priority").GetString();
                    if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(desc) || priorityStr == null)
                        continue;
                    if (!Enum.TryParse<TaskPriority>(priorityStr, true, out var priority))
                        continue;
                    result.Add(new PlanTaskItem(title, desc, priority));
                }
                catch { /* skip malformed item */ }
            }
            return result;
        }
        catch
        {
            return [];
        }
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --filter "FullyQualifiedName~Ai.Plan" --nologo -q
```

Expected:

```
Passed! - Failed: 0, Passed: 8, Skipped: 0, Total: 8
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Ai/Plan/Conversation/ \
        backend/tests/ProjectManagement.Application.Tests/Ai/
git commit -m "feat: add PlanConversationQueryHandler with JSON task extraction"
```

---

## Task 3: CreateProjectWithPlanCommandHandler

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/CreateProjectWithPlan/CreateProjectWithPlanCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/CreateProjectWithPlan/CreateProjectWithPlanCommandHandler.cs`

- [ ] **Step 1: Create CreateProjectWithPlanCommand.cs**

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;

namespace ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;

public sealed record CreateProjectWithPlanCommand(
    string Name,
    string Description,
    IReadOnlyList<PlanTaskItem> Tasks)
    : IRequest<Result<ProjectDto>>;
```

- [ ] **Step 2: Create CreateProjectWithPlanCommandHandler.cs**

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;

internal sealed class CreateProjectWithPlanCommandHandler(
    IProjectRepository projectRepository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateProjectWithPlanCommand, Result<ProjectDto>>
{
    public async Task<Result<ProjectDto>> Handle(CreateProjectWithPlanCommand req, CancellationToken ct)
    {
        if (!currentUser.IsProjectManager && !currentUser.IsAdmin)
            return Error.Forbidden("Plan.Forbidden", "Only Project Managers and Admins can apply a plan.");

        var project = Project.Create(req.Name, currentUser.UserId, req.Description);
        await projectRepository.AddAsync(project, ct);

        var projectLog = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"created project \"{req.Name}\" from AI plan", "Project", project.Id, req.Name);
        await activityRepository.AddAsync(projectLog, ct);

        foreach (var item in req.Tasks)
        {
            var task = ProjectTask.Create(
                title: item.Title,
                projectId: project.Id,
                reporterId: currentUser.UserId,
                description: item.Description,
                priority: item.Priority);
            await taskRepository.AddAsync(task, ct);
        }

        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<ProjectDto>(project);
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
cd backend && dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj -c Debug --nologo -q
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Ai/Plan/CreateProjectWithPlan/
git commit -m "feat: add CreateProjectWithPlanCommandHandler"
```

---

## Task 4: AddPlanTasksCommandHandler

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/AddPlanTasks/AddPlanTasksCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Ai/Plan/AddPlanTasks/AddPlanTasksCommandHandler.cs`

- [ ] **Step 1: Create AddPlanTasksCommand.cs**

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;

namespace ProjectManagement.Application.Features.Ai.Plan.AddPlanTasks;

public sealed record AddPlanTasksCommand(
    Guid ProjectId,
    IReadOnlyList<PlanTaskItem> Tasks)
    : IRequest<Result<IReadOnlyList<TaskDto>>>;
```

- [ ] **Step 2: Create AddPlanTasksCommandHandler.cs**

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Ai.Plan.AddPlanTasks;

internal sealed class AddPlanTasksCommandHandler(
    IProjectRepository projectRepository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<AddPlanTasksCommand, Result<IReadOnlyList<TaskDto>>>
{
    public async Task<Result<IReadOnlyList<TaskDto>>> Handle(AddPlanTasksCommand req, CancellationToken ct)
    {
        if (!currentUser.IsProjectManager && !currentUser.IsAdmin)
            return Error.Forbidden("Plan.Forbidden", "Only Project Managers and Admins can apply a plan.");

        var project = await projectRepository.GetByIdAsync(req.ProjectId, ct);
        if (project == null)
            return Error.NotFound("Plan.ProjectNotFound", $"Project {req.ProjectId} not found.");

        var created = new List<ProjectTask>();
        foreach (var item in req.Tasks)
        {
            var task = ProjectTask.Create(
                title: item.Title,
                projectId: req.ProjectId,
                reporterId: currentUser.UserId,
                description: item.Description,
                priority: item.Priority);
            await taskRepository.AddAsync(task, ct);
            created.Add(task);
        }

        var actLog = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"added {created.Count} tasks from AI plan", "Project", req.ProjectId, project.Name);
        await activityRepository.AddAsync(actLog, ct);

        await unitOfWork.SaveChangesAsync(ct);

        return (IReadOnlyList<TaskDto>)created.Select(mapper.Map<TaskDto>).ToList();
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
cd backend && dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj -c Debug --nologo -q
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Ai/Plan/AddPlanTasks/
git commit -m "feat: add AddPlanTasksCommandHandler"
```

---

## Task 5: API endpoints

**Files:**
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/AiController.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Controllers/ProjectsController.cs`

- [ ] **Step 1: Update AiController.cs**

Add to the existing usings and class body. The full file after modification:

```csharp
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Ai.Ask;
using ProjectManagement.Application.Features.Ai.Plan;
using ProjectManagement.Application.Features.Ai.Plan.Conversation;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Roles = "ProjectManager,Admin")]
public class AiController(IMediator mediator) : ControllerBase
{
    [HttpPost("ask")]
    public async Task<ActionResult<AiResponse>> Ask([FromBody] AiAskBody body, CancellationToken ct)
        => (await mediator.Send(new AskAiQuery(body.Question, body.ProjectId, body.History), ct)).ToActionResult(this);

    [HttpPost("plan/conversation")]
    public async Task<ActionResult<PlanConversationResponse>> PlanConversation(
        [FromBody] PlanConversationBody body, CancellationToken ct)
        => (await mediator.Send(
            new PlanConversationQuery(body.History, body.NewMessage, body.Phase), ct))
            .ToActionResult(this);
}

public record AiAskBody(string Question, Guid? ProjectId = null, IReadOnlyList<ChatMessage>? History = null);

public record PlanConversationBody(
    IReadOnlyList<PlanConversationMessage> History,
    string NewMessage,
    PlanConversationPhase Phase);
```

- [ ] **Step 2: Add plan-tasks endpoints to ProjectsController.cs**

Add these using statements at the top of `ProjectsController.cs` (after the existing usings):

```csharp
using ProjectManagement.Application.Features.Ai.Plan;
using ProjectManagement.Application.Features.Ai.Plan.AddPlanTasks;
using ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;
using ProjectManagement.Application.Features.Tasks.DTOs;
```

Add these two action methods to the `ProjectsController` class (before the closing brace):

```csharp
[HttpPost("from-plan")]
[Authorize(Roles = "ProjectManager,Admin")]
public async Task<ActionResult<ProjectDto>> CreateFromPlan(
    [FromBody] CreateFromPlanRequest request, CancellationToken ct)
{
    var result = await mediator.Send(
        new CreateProjectWithPlanCommand(request.Name, request.Description, request.Tasks), ct);
    if (!result.IsSuccess) return result.ToActionResult(this);
    return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
}

[HttpPost("{id:guid}/plan-tasks")]
[Authorize(Roles = "ProjectManager,Admin")]
public async Task<ActionResult<IReadOnlyList<TaskDto>>> AddPlanTasks(
    Guid id, [FromBody] AddPlanTasksRequest request, CancellationToken ct)
    => (await mediator.Send(new AddPlanTasksCommand(id, request.Tasks), ct)).ToActionResult(this);
```

Add these request record types at the end of `ProjectsController.cs` (after the last existing request record):

```csharp
public record CreateFromPlanRequest(string Name, string Description, IReadOnlyList<PlanTaskItem> Tasks);
public record AddPlanTasksRequest(IReadOnlyList<PlanTaskItem> Tasks);
```

- [ ] **Step 3: Build the full solution**

```bash
cd backend && dotnet build ProjectManagement.sln -c Debug --nologo -q
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.WebApi/Controllers/AiController.cs \
        backend/src/ProjectManagement.WebApi/Controllers/ProjectsController.cs
git commit -m "feat: expose plan conversation, create-from-plan, and plan-tasks API endpoints"
```

---

## Task 6: Frontend — AiService plan methods

**Files:**
- Modify: `frontend/libs/shared/util/src/lib/ai.service.ts`

- [ ] **Step 1: Update ai.service.ts with plan types and methods**

Replace the entire file with:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface AiResponse  { answer: string; suggestions: string[]; }

export interface PlanConversationMessage { role: 'user' | 'assistant'; content: string; }
export type PlanConversationPhase = 'Clarifying' | 'Generating' | 'Extracting';
export interface PlanTaskItem { title: string; description: string; priority: 'Low' | 'Medium' | 'High'; }
export interface PlanConversationResponse { response: string | null; tasks: PlanTaskItem[] | null; }
export interface CreateProjectFromPlanRequest { name: string; description: string; tasks: PlanTaskItem[]; }

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${environment.apiUrl}/ai`;
  private readonly projectsBase = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  ask(question: string, projectId?: string, history: ChatMessage[] = []): Observable<AiResponse> {
    return this.http.post<AiResponse>(this.base + '/ask', { question, projectId, history });
  }

  planConversation(
    history: PlanConversationMessage[],
    newMessage: string,
    phase: PlanConversationPhase
  ): Observable<PlanConversationResponse> {
    return this.http.post<PlanConversationResponse>(this.base + '/plan/conversation', { history, newMessage, phase });
  }

  createProjectFromPlan(req: CreateProjectFromPlanRequest): Observable<{ id: string; name: string }> {
    return this.http.post<{ id: string; name: string }>(this.projectsBase + '/from-plan', req);
  }

  addPlanTasks(projectId: string, tasks: PlanTaskItem[]): Observable<unknown> {
    return this.http.post(this.projectsBase + `/${projectId}/plan-tasks`, { tasks });
  }
}
```

- [ ] **Step 2: Build frontend to verify**

```bash
cd frontend && npx nx build shared-util --skip-nx-cache 2>&1 | tail -5
```

Expected: `Successfully ran target build for project shared-util`

- [ ] **Step 3: Commit**

```bash
git add frontend/libs/shared/util/src/lib/ai.service.ts
git commit -m "feat: add planConversation, createProjectFromPlan, addPlanTasks to AiService"
```

---

## Task 7: AiAssistantComponent — mode toggle and plan conversation

**Files:**
- Modify: `frontend/libs/layout/feature/src/lib/ai-assistant.component.ts`

- [ ] **Step 1: Add imports and new signals to the component class**

In `ai-assistant.component.ts`, add to the import statement at the top:

```typescript
import { AiService, ChatMessage, PlanConversationMessage, PlanConversationPhase, PlanTaskItem } from '@pm/shared/util';
import { AuthService } from '@pm/auth/data-access';
```

In the `AiAssistantComponent` class body, after `private sanitizer = inject(DomSanitizer);`, add:

```typescript
  private authSvc = inject(AuthService);

  // Plan Mode state
  mode            = signal<'ask' | 'plan'>('ask');
  canUsePlanMode  = computed(() => this.authSvc.isProjectManager() || this.authSvc.isAdmin());
  planPhase       = signal<'clarifying' | 'generating' | 'confirming' | 'applying'>('clarifying');
  planMessages    = signal<PlanConversationMessage[]>([]);
  planLoading     = signal(false);
  planError       = signal('');
  pendingSpec     = signal('');
  pendingTasks    = signal<PlanTaskItem[]>([]);
  checkedTasks    = signal<boolean[]>([]);
  newProjectName  = signal('');
  newProjectDesc  = signal('');
```

- [ ] **Step 2: Add switchMode and sendPlan methods**

In the component class, add these methods after `clearChat()`:

```typescript
  switchMode(m: 'ask' | 'plan') {
    this.mode.set(m);
    this.messages.set([]);
    this.suggestions.set([]);
    this.planMessages.set([]);
    this.planPhase.set('clarifying');
    this.planError.set('');
    this.pendingSpec.set('');
    this.pendingTasks.set([]);
    this.checkedTasks.set([]);
    this.newProjectName.set('');
    this.newProjectDesc.set('');
  }

  sendPlan() {
    const text = this.input.trim();
    if (!text || this.planLoading()) return;

    this.planError.set('');
    const history = [...this.planMessages()];
    this.planMessages.update(msgs => [
      ...msgs,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);
    this.input = '';
    this.planLoading.set(true);
    this.shouldScroll = true;

    this.aiSvc.planConversation(history, text, 'Clarifying').subscribe({
      next: ({ response }) => {
        this.planMessages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', content: response ?? '' },
        ]);
        this.planLoading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.planMessages.update(msgs => msgs.slice(0, -1));
        this.planError.set('Something went wrong. Try again.');
        this.planLoading.set(false);
      },
    });
  }

  generateSpec() {
    if (this.planLoading()) return;
    this.planError.set('');
    this.planPhase.set('generating');
    this.planLoading.set(true);

    const history = this.planMessages().filter(m => m.content !== '');
    this.aiSvc.planConversation(history, '', 'Generating').subscribe({
      next: ({ response }) => {
        this.pendingSpec.set(response ?? '');
        this.extractTasks(response ?? '');
      },
      error: () => {
        this.planPhase.set('clarifying');
        this.planError.set('Failed to generate spec. Try again.');
        this.planLoading.set(false);
      },
    });
  }

  private extractTasks(spec: string) {
    this.aiSvc.planConversation([], spec, 'Extracting').subscribe({
      next: ({ tasks }) => {
        if (!tasks || tasks.length === 0) {
          this.planError.set("Claude couldn't extract tasks. Try rephrasing and generate again.");
          this.planPhase.set('clarifying');
          this.planLoading.set(false);
          return;
        }
        const h1Match = spec.match(/^#\s+(.+)$/m);
        const paraMatch = spec.match(/^(?!#)[^\n]+\n/m);
        this.newProjectName.set(h1Match ? h1Match[1].trim() : 'New Project');
        this.newProjectDesc.set(paraMatch ? paraMatch[0].trim() : '');
        this.pendingTasks.set(tasks);
        this.checkedTasks.set(tasks.map(() => true));
        this.planPhase.set('confirming');
        this.planLoading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.planPhase.set('clarifying');
        this.planError.set('Failed to extract tasks. Try again.');
        this.planLoading.set(false);
      },
    });
  }

  toggleTask(index: number) {
    this.checkedTasks.update(arr => {
      const copy = [...arr];
      copy[index] = !copy[index];
      return copy;
    });
  }

  confirmedTaskCount(): number {
    return this.checkedTasks().filter(Boolean).length;
  }

  applyPlan() {
    const tasks = this.pendingTasks().filter((_, i) => this.checkedTasks()[i]);
    if (tasks.length === 0) return;
    this.planPhase.set('applying');
    this.planError.set('');

    if (this.selectedProjectId) {
      this.aiSvc.addPlanTasks(this.selectedProjectId, tasks).subscribe({
        next: () => this.onPlanApplied('Tasks added to backlog.'),
        error: () => {
          this.planPhase.set('confirming');
          this.planError.set('Failed to add tasks. Try again.');
        },
      });
    } else {
      this.aiSvc.createProjectFromPlan({
        name: this.newProjectName(),
        description: this.newProjectDesc(),
        tasks,
      }).subscribe({
        next: (p) => this.onPlanApplied(`Project "${p.name}" created with ${tasks.length} tasks.`),
        error: () => {
          this.planPhase.set('confirming');
          this.planError.set('Failed to create project. Try again.');
        },
      });
    }
  }

  private onPlanApplied(message: string) {
    this.planPhase.set('clarifying');
    this.planMessages.set([
      { role: 'assistant', content: `✅ ${message} Switch to Ask mode to query your new data.` },
    ]);
    this.pendingTasks.set([]);
    this.checkedTasks.set([]);
    this.planLoading.set(false);
  }
```


- [ ] **Step 3: Commit**

```bash
git add frontend/libs/layout/feature/src/lib/ai-assistant.component.ts
git commit -m "feat: add Plan Mode logic and state to AiAssistantComponent"
```

---

## Task 8: AiAssistantComponent — Plan Mode template

**Files:**
- Modify: `frontend/libs/layout/feature/src/lib/ai-assistant.component.ts`

- [ ] **Step 1: Add mode toggle to the header template**

In the template, find the `<div class="scope-row">` block and add the mode toggle row immediately before it:

```html
          <!-- Mode toggle — PM/Admin only -->
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

- [ ] **Step 2: Add Plan Mode body to the template**

After the closing `}` of the `@if (messages().length === 0)` / `@else` block (the ask mode conversation area), add:

```html
        <!-- ── Plan Mode ─────────────────────────────────── -->
        @if (mode() === 'plan') {
          <div class="plan-body">

            @if (planPhase() === 'clarifying' || planPhase() === 'generating') {
              <!-- Plan conversation messages -->
              <div class="messages" #messageList>
                @if (planMessages().length === 0) {
                  <div class="plan-welcome">
                    <div class="plan-icon"><span class="material-icons-round">auto_fix_high</span></div>
                    <p class="plan-hint">
                      @if (selectedProjectId) {
                        Describe a feature you want to plan for <strong>{{ projectName() }}</strong>.
                      } @else {
                        Describe the project you want to build. I'll ask a few questions, then generate a spec and task list.
                      }
                    </p>
                  </div>
                }
                @for (msg of planMessages(); track $index) {
                  <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                    @if (msg.role === 'assistant') {
                      <div class="msg-avatar" [class.pulsing]="$last && planLoading()">
                        <span class="material-icons-round">auto_fix_high</span>
                      </div>
                    }
                    <div class="msg-bubble" [class.thinking]="$last && planLoading() && msg.content === ''">
                      @if ($last && planLoading() && msg.content === '') {
                        <div class="thinking-body">
                          <div class="thinking-label"><span class="thinking-dot"></span>Thinking</div>
                          <div class="shimmer-lines">
                            <div class="shimmer-line w80"></div>
                            <div class="shimmer-line w60"></div>
                            <div class="shimmer-line w90"></div>
                          </div>
                        </div>
                      } @else if (msg.role === 'assistant') {
                        <div class="msg-text md-body" [innerHTML]="toHtml(msg.content)"></div>
                      } @else {
                        <pre class="msg-text">{{ msg.content }}</pre>
                      }
                    </div>
                  </div>
                }
              </div>

              @if (planError()) {
                <div class="plan-error">{{ planError() }}</div>
              }

              @if (planMessages().length >= 4 && !planLoading()) {
                <div class="plan-generate-row">
                  <button class="generate-btn" (click)="generateSpec()" [disabled]="planLoading()">
                    <span class="material-icons-round">rocket_launch</span> Generate spec & tasks
                  </button>
                </div>
              }
            }

            @if (planPhase() === 'confirming') {
              <!-- Confirmation panel -->
              <div class="confirm-panel">
                @if (!selectedProjectId) {
                  <label class="confirm-label">Project name</label>
                  <input class="confirm-input" [value]="newProjectName()" (input)="newProjectName.set($any($event.target).value)" />
                  <label class="confirm-label">Description</label>
                  <textarea class="confirm-textarea" [value]="newProjectDesc()" (input)="newProjectDesc.set($any($event.target).value)" rows="3"></textarea>
                }
                <div class="confirm-tasks-header">
                  <span class="confirm-tasks-title">Tasks ({{ confirmedTaskCount() }} / {{ pendingTasks().length }} selected)</span>
                </div>
                <div class="confirm-tasks">
                  @for (task of pendingTasks(); track $index) {
                    <label class="task-row" [class.unchecked]="!checkedTasks()[$index]">
                      <input type="checkbox" [checked]="checkedTasks()[$index]" (change)="toggleTask($index)" />
                      <div class="task-info">
                        <span class="task-title">{{ task.title }}</span>
                        <span class="task-desc">{{ task.description }}</span>
                      </div>
                      <span class="priority-badge" [class]="'p-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                    </label>
                  }
                </div>
                @if (planError()) {
                  <div class="plan-error">{{ planError() }}</div>
                }
                <button class="apply-btn" (click)="applyPlan()" [disabled]="confirmedTaskCount() === 0">
                  <span class="material-icons-round">check_circle</span>
                  Apply {{ confirmedTaskCount() }} task{{ confirmedTaskCount() !== 1 ? 's' : '' }}
                </button>
              </div>
            }

            @if (planPhase() === 'applying') {
              <div class="plan-applying">
                <span class="material-icons-round spinning">sync</span>
                Applying plan…
              </div>
            }

          </div>
        }
```

Note: The `@if (mode() === 'plan')` block must be added **inside** the `@if (open())` block (the `<div class="ai-panel">`), after the ask-mode content. The ask-mode content (`@if (messages().length === 0)` welcome + `@else` messages block, suggestions, and input-area) should be wrapped in `@if (mode() === 'ask') { ... }` to hide it when in Plan Mode.

Specifically, wrap these existing blocks in `@if (mode() === 'ask') { }`:
- The `@if (messages().length === 0)` / `@else` block
- The `@if (suggestions().length > 0 && !loading())` suggestions block
- The `<div class="input-area">` block

Then after the closing `}` of `@if (mode() === 'ask')`, add the `@if (mode() === 'plan')` block above.

For Plan Mode, the input area is already there in the plan conversation section (use the existing input-area for ask mode; for plan mode, add a separate input area inside the `@if (planPhase() === 'clarifying' || planPhase() === 'generating')` block).

Add a Plan Mode input area inside the clarifying phase block, after the generate button row:

```html
              <!-- Plan input -->
              <div class="input-area">
                <div class="input-shell" [class.focused]="focused" [class.disabled]="planLoading()">
                  <textarea
                    [(ngModel)]="input"
                    (keydown.enter)="onPlanEnter($event)"
                    (focus)="focused = true"
                    (blur)="focused = false"
                    [disabled]="planLoading()"
                    placeholder="Describe your idea or answer the question…"
                    rows="1"
                    class="ai-input"
                  ></textarea>
                  <button class="send-btn" (click)="sendPlan()" [disabled]="!input.trim() || planLoading()">
                    <span class="material-icons-round">{{ planLoading() ? 'hourglass_top' : 'arrow_upward' }}</span>
                  </button>
                </div>
                <p class="input-hint">Enter to send · Shift+Enter for new line</p>
              </div>
```

Add `onPlanEnter` method to the class:

```typescript
  onPlanEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) { event.preventDefault(); this.sendPlan(); }
  }
```

- [ ] **Step 3: Add styles for Plan Mode elements**

In the component's `styles` array, add these new CSS rules after the existing dark mode rules:

```css
    /* ── Plan Mode ────────────────────────────────────── */
    .mode-row {
      display: flex; gap: 6px; margin-top: 10px; position: relative; z-index: 1;
    }
    .mode-chip {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 14px; border-radius: 20px; border: 1.5px solid rgba(99,102,241,.2);
      background: rgba(255,255,255,.6); font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer;
      transition: all .15s;
    }
    .mode-chip .material-icons-round { font-size: 14px; }
    .mode-chip.active {
      background: var(--violet); color: #fff; border-color: var(--violet);
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
    }
    .mode-chip:not(.active):hover { border-color: var(--violet); color: var(--violet); }

    .plan-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .plan-welcome {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 32px 24px; text-align: center;
    }
    .plan-icon {
      width: 56px; height: 56px; border-radius: 18px;
      background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px rgba(99,102,241,.35);
    }
    .plan-icon .material-icons-round { font-size: 26px; color: #fff; }
    .plan-hint { font-size: 13px; color: var(--muted); max-width: 280px; line-height: 1.5; margin: 0; }

    .plan-generate-row {
      padding: 8px 16px; flex-shrink: 0;
    }
    .generate-btn {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px; border-radius: 12px; border: none;
      background: var(--violet); color: #fff; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 3px 12px rgba(99,102,241,.35);
      transition: opacity .15s, transform .15s;
    }
    .generate-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: .92; }
    .generate-btn:disabled { opacity: .45; cursor: not-allowed; }
    .generate-btn .material-icons-round { font-size: 16px; }

    .plan-error {
      margin: 6px 16px; padding: 8px 12px; border-radius: 8px;
      background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
      color: #dc2626; font-size: 12px; line-height: 1.4;
    }

    /* ── Confirmation panel ──────────────────────────── */
    .confirm-panel {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .confirm-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
    .confirm-input {
      width: 100%; padding: 8px 12px; border-radius: 10px;
      border: 1.5px solid rgba(99,102,241,.2); background: rgba(255,255,255,.7);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      outline: none; transition: border-color .15s;
      box-sizing: border-box;
    }
    .confirm-input:focus { border-color: var(--violet); }
    .confirm-textarea {
      width: 100%; padding: 8px 12px; border-radius: 10px;
      border: 1.5px solid rgba(99,102,241,.2); background: rgba(255,255,255,.7);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      outline: none; resize: vertical; transition: border-color .15s;
      box-sizing: border-box;
    }
    .confirm-textarea:focus { border-color: var(--violet); }
    .confirm-tasks-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 0;
    }
    .confirm-tasks-title { font-size: 12px; font-weight: 600; color: var(--muted); }
    .confirm-tasks { display: flex; flex-direction: column; gap: 6px; }
    .task-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      border: 1px solid rgba(99,102,241,.12);
      background: rgba(255,255,255,.6); cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .task-row:hover { border-color: rgba(99,102,241,.3); }
    .task-row.unchecked { opacity: .5; }
    .task-row input[type=checkbox] { margin-top: 2px; flex-shrink: 0; accent-color: var(--violet); }
    .task-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .task-title { font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.3; }
    .task-desc { font-size: 11.5px; color: var(--muted); line-height: 1.4; }
    .priority-badge {
      flex-shrink: 0; padding: 2px 8px; border-radius: 20px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
      margin-top: 1px;
    }
    .p-low    { background: rgba(107,114,128,.12); color: #6b7280; }
    .p-medium { background: rgba(245,158,11,.12);  color: #d97706; }
    .p-high   { background: rgba(239,68,68,.12);   color: #dc2626; }

    .apply-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 12px; border-radius: 12px; border: none;
      background: var(--violet); color: #fff; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 3px 12px rgba(99,102,241,.35);
      transition: opacity .15s, transform .15s;
      margin-top: 4px;
    }
    .apply-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .apply-btn:disabled { opacity: .45; cursor: not-allowed; }
    .apply-btn .material-icons-round { font-size: 18px; }

    .plan-applying {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; color: var(--muted); font-size: 14px;
    }
    .plan-applying .material-icons-round { font-size: 32px; color: var(--violet); }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
```

- [ ] **Step 4: Build the frontend project**

```bash
cd frontend && npx nx build layout-feature --skip-nx-cache 2>&1 | tail -10
```

Expected: `Successfully ran target build for project layout-feature`

- [ ] **Step 5: Commit**

```bash
git add frontend/libs/layout/feature/src/lib/ai-assistant.component.ts
git commit -m "feat: add Plan Mode template and styles to AiAssistantComponent"
```

---

## Task 9: Run all tests and verify backend builds clean

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && dotnet test ProjectManagement.sln --nologo -q
```

Expected: `Passed! - Failed: 0, Passed: N, Skipped: 0`

- [ ] **Step 2: Full backend build**

```bash
cd backend && dotnet build ProjectManagement.sln -c Release --nologo -q
```

Expected: `Build succeeded.`

- [ ] **Step 3: Frontend type-check**

```bash
cd frontend && npx nx run-many -t build --projects=layout-feature,shared-util --skip-nx-cache 2>&1 | tail -10
```

Expected: both projects build with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: AI Plan Mode — complete backend and frontend implementation"
```
