# AI Plan Mode Design

## Overview

Add a **Plan Mode** to the existing AI assistant panel that lets Project Managers and Admins spec out a new project or plan a feature inside an existing project through a conversational AI flow. The conversation produces a markdown spec and a confirmed task list that is applied directly to the app.

---

## Authorization

Only users with role `ProjectManager` or `Admin` can access Plan Mode.

- **Frontend:** The Plan/Ask mode toggle is hidden (or disabled with a tooltip) for Staff and Client roles. Role is read from the auth state already in scope in `ai-assistant.component.ts`.
- **Backend:** `ApplyAiPlanCommand` and `PlanAiConversationQuery` handlers check `ICurrentUserService.UserRole` and return `Error.Forbidden` if the role is not `ProjectManager` or `Admin`.

---

## Two Flows

### Flow 1 — New Project

PM describes a project idea → AI asks clarifying questions → AI generates spec + tasks → PM reviews confirmation checklist → confirms → backend creates project with backlog tasks.

### Flow 2 — Feature in Existing Project

PM selects an existing project scope (already in the AI panel's scope dropdown) then enters Plan Mode → same conversational flow → PM reviews checklist → confirms → backend adds tasks to that project's backlog.

The flows share the same conversation loop and confirmation UX. The only difference is the apply step: Flow 1 calls `CreateProjectWithPlanCommand`; Flow 2 calls `AddPlanTasksCommand`.

---

## Conversation Flow

**Phase 1 — Clarifying (3–6 turns)**

PM types a brief description. Claude asks one clarifying question per turn. Questions focus on: scope boundaries, target users, key constraints, success criteria, and rough size. The frontend sends the full conversation history on each turn so Claude has context.

**Phase 2 — Spec Generation**

After enough context (Claude decides, or PM types "generate"), a single backend call sends the full conversation plus a generation prompt. Claude returns a freeform **markdown spec** — no structured format required at this step.

**Phase 3 — Task Extraction**

Immediately after receiving the spec, a second backend call sends the spec plus an extraction prompt asking Claude to output a fenced JSON block only:

```
```json
[
  { "title": "...", "description": "...", "priority": "Low|Medium|High" }
]
```
```

The backend uses defensive parsing: extract the content between the first ` ```json ` and ` ``` ` fences, attempt `JsonSerializer.Deserialize`, skip any malformed task objects, accept the rest.

**Phase 4 — Confirmation**

Frontend displays:
- For new project: editable project name field + editable description field
- For both flows: task checklist — each task shows title, description, priority badge. PM can deselect individual tasks.
- "Apply" button (disabled if zero tasks selected).

**Phase 5 — Apply**

PM clicks Apply. Frontend sends confirmed tasks (plus project name/description for Flow 1, or existing project ID for Flow 2) to the backend. Tasks are created with status `Todo`, no sprint assignment, no subtasks, no estimates.

---

## Backend Architecture

### New Queries / Commands

**`PlanAiConversationQuery`**
- Input: `List<ConversationMessage> History`, `string NewMessage`, `PlanConversationPhase Phase` (Clarifying | Generating | Extracting)
- Handler: builds phase-specific system prompt, appends history + new message, calls `IClaudeService.AskAsync`, returns `string Response`
- No persistence — stateless query

**`CreateProjectWithPlanCommand`**
- Input: `string Name`, `string Description`, `List<PlanTaskItem> Tasks`
- Handler: creates `Project` entity, creates `TaskItem` entities for each confirmed task, saves, returns `ProjectDto`
- Role check: PM/Admin only

**`AddPlanTasksCommand`**
- Input: `Guid ProjectId`, `List<PlanTaskItem> Tasks`
- Handler: validates project exists and user has access, creates `TaskItem` entities, saves, returns `List<TaskItemDto>`
- Role check: PM/Admin only

**`PlanTaskItem`** (shared DTO):
```csharp
public record PlanTaskItem(string Title, string Description, TaskPriority Priority);
```

### Prompts

Prompts are defined as private constants in the handler (not external files). Three prompts:

1. **Clarifying system prompt** — instructs Claude to act as a project planning assistant, ask one focused question per turn, avoid generating tasks until asked
2. **Generation prompt** — appended as user message after clarifying phase: "Now generate a markdown project spec based on our conversation"
3. **Extraction prompt** — sent as a fresh user message after spec is received: "Convert the spec above into a JSON task list with this exact format: `[{\"title\": \"\", \"description\": \"\", \"priority\": \"Low|Medium|High\"}]`. Output only the fenced JSON block, nothing else."

---

## Frontend Architecture

### Mode Toggle

`ai-assistant.component.ts` gains a `mode: Signal<'ask' | 'plan'>` signal. The toggle renders only when `currentUserRole` is `ProjectManager` or `Admin`. Switching modes resets conversation state.

### Plan Mode State

```typescript
planPhase: Signal<'clarifying' | 'generating' | 'confirming' | 'applying'>
planMessages: Signal<ConversationMessage[]>
pendingSpec: Signal<string>         // raw markdown from phase 2
pendingTasks: Signal<PlanTaskItem[]> // parsed from phase 3
confirmedTasks: Signal<PlanTaskItem[]> // PM-selected subset
newProjectName: Signal<string>
newProjectDescription: Signal<string>
```

### Confirmation Panel

Rendered inside the AI assistant panel (not a modal) when `planPhase === 'confirming'`. Contains:
- Flow 1 only: name input + description textarea (pre-filled: frontend extracts the first H1 heading from the markdown spec as the project name, and the first paragraph as the description; both are editable before applying)
- Task list with checkboxes
- Priority badge per task (color-coded: Low=grey, Medium=amber, High=red)
- Apply button

### Error Handling

- Bridge failure: show inline error message with "Try again" button that re-sends the last message
- Empty parsed task list: show "Claude couldn't extract tasks — try rephrasing or continue the conversation" with option to go back to clarifying phase
- Partial parse: silently skip malformed task objects, show however many valid ones were extracted

---

## API Endpoints

```
POST /api/ai/plan/conversation
Body: { history: [...], newMessage: string, phase: string }
Response: { response: string }

POST /api/projects/from-plan
Body: { name: string, description: string, tasks: [...] }
Response: ProjectDto

POST /api/projects/{projectId}/plan-tasks
Body: { tasks: [...] }
Response: TaskItemDto[]
```

---

## What This Does Not Include

- Sprint assignment at creation time (PM assigns manually from backlog)
- Subtask or estimate generation
- Saving/resuming plan conversations
- Sharing or exporting the markdown spec as a file
- Plan Mode for Staff or Client roles
