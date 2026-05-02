using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Calendar.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Calendar.GetCalendarEvents;

internal sealed class GetCalendarEventsQueryHandler(
    IProjectRepository projectRepo,
    ITaskRepository taskRepo,
    ISprintRepository sprintRepo,
    ICurrentUserService currentUser)
    : IRequestHandler<GetCalendarEventsQuery, Result<List<CalendarEventDto>>>
{
    private static readonly string[] Palette =
    [
        "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
        "#22c55e", "#14b8a6", "#0ea5e9", "#eab308"
    ];

    public async Task<Result<List<CalendarEventDto>>> Handle(
        GetCalendarEventsQuery request, CancellationToken ct)
    {
        var seeAll = currentUser.IsAdmin || currentUser.IsProjectManager;

        var projects = await projectRepo.GetProjectSummariesForUserAsync(
            currentUser.UserId, seeAll, ct);

        if (projects.Count == 0)
            return Result<List<CalendarEventDto>>.Success([]);

        var projectMap = projects
            .Select((p, i) => (p, Color: Palette[i % Palette.Length]))
            .ToDictionary(x => x.p.Id, x => (x.p.Name, x.Color));

        var projectIds = projectMap.Keys.ToList();
        var startUtc   = DateTime.SpecifyKind(request.Start, DateTimeKind.Utc);
        var endUtc     = DateTime.SpecifyKind(request.End,   DateTimeKind.Utc);

        var tasks = await taskRepo.FindAsync(
            t => projectIds.Contains(t.ProjectId)
                 && t.DueDate.HasValue
                 && t.DueDate.Value >= startUtc
                 && t.DueDate.Value <= endUtc,
            ct);

        var sprints = await sprintRepo.FindAsync(
            s => projectIds.Contains(s.ProjectId)
                 && s.StartDate <= endUtc
                 && s.EndDate   >= startUtc,
            ct);

        var events = new List<CalendarEventDto>(tasks.Count + sprints.Count);

        foreach (var task in tasks)
        {
            if (!projectMap.TryGetValue(task.ProjectId, out var taskProject))
                continue;
            var (projectName, _) = taskProject;
            events.Add(new CalendarEventDto(
                Id:          task.Id,
                Type:        "Task",
                Title:       task.Title,
                Start:       task.DueDate!.Value,
                End:         task.DueDate!.Value.AddHours(1),
                ProjectId:   task.ProjectId,
                ProjectName: projectName,
                Color:       PriorityColor(task.Priority),
                Priority:    task.Priority.ToString(),
                IsCompleted: task.Status == TaskStatus.Done
            ));
        }

        foreach (var sprint in sprints)
        {
            if (!projectMap.TryGetValue(sprint.ProjectId, out var sprintProject))
                continue;
            var (projectName, color) = sprintProject;
            events.Add(new CalendarEventDto(
                Id:          sprint.Id,
                Type:        "Sprint",
                Title:       sprint.Name,
                Start:       sprint.StartDate,
                End:         sprint.EndDate,
                ProjectId:   sprint.ProjectId,
                ProjectName: projectName,
                Color:       color,
                Priority:    null,
                IsCompleted: sprint.IsCompleted
            ));
        }

        return Result<List<CalendarEventDto>>.Success(events);
    }

    private static string PriorityColor(TaskPriority priority) => priority switch
    {
        TaskPriority.Critical => "#ef4444",
        TaskPriority.High     => "#f97316",
        TaskPriority.Medium   => "#3b82f6",
        TaskPriority.Low      => "#22c55e",
        _                     => "#6b7280"
    };
}
