# AI Standup — Updates Tab Design Spec

## Goal

Add an **Updates** tab to the project detail view. The tab generates AI-written standup summaries for each team member from existing `ActivityLog` and `TimeLog` data. PMs can generate standups manually or schedule them to run automatically at a configured time each morning.

---

## Architecture

Four backend components:

1. **`StandupSettings`** (domain entity, one per project) — stores the schedule configuration: `IsEnabled`, `ScheduledTime`, `LastRunAt`.
2. **`StandupReport`** (domain entity, one per generation run) — stores the AI output as a JSON string, generation timestamp, and whether triggered manually or by schedule.
3. **`StandupGeneratorService`** (application service) — shared logic used by both the manual API endpoint and the background scheduler. Queries activity data, calls Claude, saves the report.
4. **`StandupSchedulerService`** (BackgroundService) — wakes every minute, finds projects due for a scheduled run, delegates to `StandupGeneratorService`.

---

## Domain Entities

### `StandupSettings`

```
ProjectId         Guid (1:1 with Project)
IsEnabled         bool
ScheduledTime     TimeOnly
LastRunAt         DateTime?
```

Created lazily on first access (defaults: `IsEnabled = false`, `ScheduledTime = 08:00`).

### `StandupReport`

```
ProjectId         Guid
GeneratedAt       DateTime (UTC)
IsScheduled       bool  (false = manual trigger)
GeneratedById     string?  (null if scheduled)
ReportJson        string  — JSON array: [{ userId, name, summary }]
```

---

## Data Collection

Per generation run, for each active project member:

- **ActivityLog** rows where `UserId` matches and `CreatedAt >= utcNow - 24h` and `ProjectId = projectId`. This requires adding a `ProjectId` (nullable `Guid`) field to the `ActivityLog` entity and populating it in all existing `ActivityLog.Create()` call sites (tasks, issues, vault, comments domain event handlers).
- **TimeLog** rows where `UserId` matches and `LoggedDate = today (UTC)`. TimeLog links to `ProjectTask` which links to the project — filter via `Task.ProjectId = projectId`.

If a member has zero entries in both, their summary is set to `"No activity recorded."` without calling Claude.

---

## AI Prompt

One Claude call per member with recorded activity:

```
Write a concise standup update for [name] based on the following activity from the last 24 hours.

Format your response exactly as:
✅ Yesterday: [what they completed or worked on]
🔄 Today: [tasks currently In Progress or To Do]
⚠️ Blocked: [any task or issue in Blocked status — omit this line if none]

Be brief. Use the task/issue names from the data. Do not invent information.

Activity:
[JSON list of activity entries]
Time logged:
[JSON list of time log entries]
```

Uses the existing `IAiService` (same service wired into `AiController`).

---

## API Endpoints

All under `/api/projects/{projectId}/standup`. Role requirements vary by endpoint:

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/settings` | Any project member | Get current schedule settings |
| PUT | `/settings` | ProjectManager / Admin | Update `IsEnabled` and `ScheduledTime` |
| POST | `/generate` | ProjectManager / Admin | Manually trigger a generation run |
| GET | `/reports` | Any project member | Paginated list of past reports (id, generatedAt, isScheduled) |
| GET | `/reports/{reportId}` | Any project member | Full report detail including `ReportJson` |

---

## Background Scheduler

`StandupSchedulerService` is an ASP.NET Core `BackgroundService` (same pattern as `OverdueTaskScannerService`).

- Runs on a **1-minute timer**.
- Queries all `StandupSettings` where `IsEnabled = true`.
- For each: checks if `ScheduledTime` falls within the current UTC minute window and `LastRunAt` is null or `< today (UTC)`.
- Calls `StandupGeneratorService.GenerateAsync(projectId, isScheduled: true)`.
- Updates `LastRunAt = utcNow` after a successful run.
- Errors per project are logged and skipped — a failure for one project does not stop others.

---

## Updates Tab UI

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Updates            [Schedule: ●OFF  08:00]  [▶ Generate]│
├─────────────────────────────────────────────────────────┤
│  Latest · Apr 28, 2026 · Generated automatically        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ John Doe     │  │ Jane Smith   │  │ Mike T.      │   │
│  │ ✅ Yesterday │  │ ✅ Yesterday │  │ ✅ Yesterday │   │
│  │ 🔄 Today     │  │ 🔄 Today     │  │ ⚠️ Blocked   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────┤
│  History                                                 │
│  Apr 27 · Manual                                 ›       │
│  Apr 26 · Scheduled                              ›       │
└─────────────────────────────────────────────────────────┘
```

### Header bar

- **Schedule toggle**: pill toggle, off by default. Enabling it reveals the time input.
- **Time input**: `<input type="time">`, only visible when schedule is enabled. Changes save immediately via `PUT /settings`.
- **Generate Now**: always visible, triggers `POST /generate`, shows a spinner while loading.

### Latest report

- Shown as a card grid: `repeat(auto-fill, minmax(220px, 1fr))`.
- Each card: member name + avatar initials at top, then the three standup lines as plain text.
- Cards with "No activity recorded" are visually dimmed.
- Shows generation timestamp and whether it was scheduled or manual.

### History

- Collapsed list below the latest report.
- Each row: date + Manual/Scheduled badge + chevron.
- Clicking expands inline to show the full card grid for that report.
- Shows last 30 reports maximum.

---

## Empty States

- **No reports yet**: centred message "No updates generated yet. Click Generate to create the first one."
- **Generating**: spinner overlay on the card grid area with "Generating updates…"
- **Error**: inline error banner under the header, does not replace existing reports.

---

## Frontend Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `UpdatesTabComponent` | `libs/projects/feature/src/lib/updates-tab/` | Top-level tab shell, header bar, schedule toggle/time wiring |
| `StandupReportComponent` | same lib | Renders one report: card grid of member summaries |
| `StandupHistoryComponent` | same lib | Collapsible history list |
| `UpdatesService` | `libs/projects/data-access/` | HTTP calls for all standup endpoints |

---

## No New Permissions

Uses the existing `ProjectManager` / `Admin` role check already applied to AI endpoints. Regular project members can view reports but cannot trigger generation or change settings.

---

## Out of Scope

- Posting standups to team chat (TeamMessage) — the Updates tab is the destination.
- Email delivery.
- Per-member opt-out.
- Editing AI-generated summaries before saving.
