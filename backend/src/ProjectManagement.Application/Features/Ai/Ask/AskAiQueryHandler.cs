using System.Text;
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
    : IRequestHandler<AskAiQuery, Result<string>>
{
    public async Task<Result<string>> Handle(AskAiQuery req, CancellationToken ct)
    {
        var context = await BuildContextAsync(req.ProjectId, ct);
        var prompt = $"{context}\n\n---\n\nQuestion from team member: {req.Question}";

        var answer = await claude.AskAsync(prompt, ct);
        return Result<string>.Success(answer);
    }

    private async Task<string> BuildContextAsync(Guid? projectId, CancellationToken ct)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an AI assistant embedded in a project management system called ProjectHub.");
        sb.AppendLine("Answer questions based strictly on the live data provided below. Be concise, specific, and actionable.");
        sb.AppendLine("When referencing people, use their names. When referencing tasks, include the title and status.");
        sb.AppendLine();
        sb.AppendLine("=== LIVE PROJECT DATA ===");
        sb.AppendLine();

        // --- Projects ---
        var allProjects = projectId.HasValue
            ? new[] { await projects.GetByIdAsync(projectId.Value, ct) }.Where(p => p != null).Select(p => p!).ToList()
            : (await projects.GetAllAsync(ct)).ToList();

        if (!allProjects.Any())
        {
            sb.AppendLine("No projects found.");
            return sb.ToString();
        }

        // --- User name lookup ---
        var allTasks = new List<ProjectManagement.Domain.Entities.ProjectTask>();
        foreach (var project in allProjects)
        {
            var projectTasks = await tasks.FindAsync(t => t.ProjectId == project.Id, ct);
            allTasks.AddRange(projectTasks);
        }

        var userIds = allTasks
            .SelectMany(t => new[] { t.AssigneeId, t.ReporterId })
            .Where(id => id != null)
            .Distinct()
            .ToList()!;

        var nameMap = userIds.Count > 0
            ? await users.GetNamesByIdsAsync(userIds!, ct)
            : new Dictionary<string, string>();

        string Name(string? id) => id != null && nameMap.TryGetValue(id, out var n) ? n : (id ?? "Unassigned");

        // --- Per-project breakdown ---
        foreach (var project in allProjects)
        {
            sb.AppendLine($"## Project: {project.Name}");
            sb.AppendLine($"   Status: {project.Status}");
            if (project.StartDate.HasValue) sb.AppendLine($"   Started: {project.StartDate:yyyy-MM-dd}");
            if (project.EndDate.HasValue) sb.AppendLine($"   Deadline: {project.EndDate:yyyy-MM-dd}");
            sb.AppendLine();

            // Active sprint
            var activeSprint = await sprints.GetActiveSprintForProjectAsync(project.Id, ct);
            if (activeSprint != null)
            {
                sb.AppendLine($"   Active Sprint: {activeSprint.Name}");
                if (!string.IsNullOrWhiteSpace(activeSprint.Goal))
                    sb.AppendLine($"   Sprint Goal: {activeSprint.Goal}");
                sb.AppendLine($"   Sprint Ends: {activeSprint.EndDate:yyyy-MM-dd}");
                sb.AppendLine();
            }

            var projectTasks = allTasks.Where(t => t.ProjectId == project.Id).ToList();

            // Summary counts
            var byStatus = projectTasks.GroupBy(t => t.Status).ToDictionary(g => g.Key, g => g.Count());
            sb.AppendLine("   Task Summary:");
            foreach (var (status, count) in byStatus.OrderBy(x => x.Key))
                sb.AppendLine($"     {status}: {count}");
            sb.AppendLine();

            // Per-person workload
            var assigned = projectTasks.Where(t => t.AssigneeId != null).ToList();
            if (assigned.Any())
            {
                sb.AppendLine("   Workload by Team Member:");
                foreach (var group in assigned.GroupBy(t => t.AssigneeId!))
                {
                    var memberName = Name(group.Key);
                    var inProgress = group.Count(t => t.Status == DomainTaskStatus.InProgress);
                    var done = group.Count(t => t.Status == DomainTaskStatus.Done);
                    var todo = group.Count(t => t.Status == DomainTaskStatus.Todo);
                    var blocked = group.Count(t => t.Status == DomainTaskStatus.Blocked);
                    var overdue = group.Count(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != DomainTaskStatus.Done && t.Status != DomainTaskStatus.Cancelled);
                    sb.AppendLine($"     {memberName}: {inProgress} in progress, {todo} todo, {done} done, {blocked} blocked{(overdue > 0 ? $", {overdue} OVERDUE" : "")}");

                    // List active tasks for this person
                    foreach (var task in group.Where(t => t.Status is DomainTaskStatus.InProgress or DomainTaskStatus.Blocked).Take(5))
                        sb.AppendLine($"       - [{task.Status}] {task.Title} (Priority: {task.Priority}{(task.DueDate.HasValue ? $", Due: {task.DueDate:yyyy-MM-dd}" : "")})");
                }
                sb.AppendLine();
            }

            // Overdue tasks
            var overdueTasks = projectTasks
                .Where(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != DomainTaskStatus.Done && t.Status != DomainTaskStatus.Cancelled)
                .OrderByDescending(t => t.Priority)
                .ToList();
            if (overdueTasks.Any())
            {
                sb.AppendLine($"   Overdue Tasks ({overdueTasks.Count}):");
                foreach (var t in overdueTasks.Take(10))
                    sb.AppendLine($"     - {t.Title} | Assigned: {Name(t.AssigneeId)} | Priority: {t.Priority} | Due: {t.DueDate:yyyy-MM-dd}");
                sb.AppendLine();
            }

            // Blocked tasks
            var blockedTasks = projectTasks.Where(t => t.Status == DomainTaskStatus.Blocked).ToList();
            if (blockedTasks.Any())
            {
                sb.AppendLine($"   Blocked Tasks ({blockedTasks.Count}):");
                foreach (var t in blockedTasks)
                    sb.AppendLine($"     - {t.Title} | Assigned: {Name(t.AssigneeId)}");
                sb.AppendLine();
            }

            // Open customer tickets
            var openTickets = await tickets.GetByProjectAsync(project.Id, null, ct);
            var unresolvedTickets = openTickets.Where(t => t.Status != TicketStatus.Resolved && t.Status != TicketStatus.Closed).ToList();
            if (unresolvedTickets.Any())
            {
                sb.AppendLine($"   Customer Tickets (open/unresolved): {unresolvedTickets.Count}");
                var critical = unresolvedTickets.Where(t => t.Priority == TaskPriority.Critical || t.Priority == TaskPriority.High).ToList();
                if (critical.Any())
                {
                    sb.AppendLine("   High/Critical tickets:");
                    foreach (var t in critical.Take(5))
                        sb.AppendLine($"     - [{t.Status}] {t.Subject} (Priority: {t.Priority})");
                }
                sb.AppendLine();
            }
        }

        // --- Recent activity (last 20 events) ---
        var recentActivity = await activity.GetRecentAsync(20, ct);
        if (recentActivity.Any())
        {
            sb.AppendLine("=== RECENT ACTIVITY (last 20 events) ===");
            foreach (var log in recentActivity)
                sb.AppendLine($"  [{log.CreatedAt:MM-dd HH:mm}] {log.UserName} {log.Action} {log.EntityType}: {log.EntityName}");
            sb.AppendLine();
        }

        return sb.ToString();
    }
}
