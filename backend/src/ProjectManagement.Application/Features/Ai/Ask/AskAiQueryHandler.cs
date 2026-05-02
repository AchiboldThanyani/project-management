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
            var cleaned = toolJson.Trim().TrimStart('`').TrimEnd('`');
            if (cleaned.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                cleaned = cleaned[4..].Trim();

            selectedTools = System.Text.Json.JsonSerializer.Deserialize<List<string>>(cleaned) ?? [];
        }
        catch
        {
            return await BuildContextAsync(projectId, ct);
        }

        if (selectedTools.Count == 0)
            return await BuildContextAsync(projectId, ct);

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
