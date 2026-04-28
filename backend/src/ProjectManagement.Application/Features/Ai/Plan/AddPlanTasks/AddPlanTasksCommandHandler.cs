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
        // Per-task activity logging is intentionally omitted to avoid flooding the feed
        // when bulk-creating tasks from an AI plan. A single project-level entry covers the audit trail.
        foreach (var item in req.Tasks)
        {
            var taskNumber = await taskRepository.GetNextTaskNumberAsync(req.ProjectId, ct);
            var task = ProjectTask.Create(
                title: item.Title,
                projectId: req.ProjectId,
                reporterId: currentUser.UserId,
                taskNumber: taskNumber,
                description: item.Description,
                priority: item.Priority);
            await taskRepository.AddAsync(task, ct);
            created.Add(task);
        }

        var actLog = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"added {created.Count} tasks from AI plan", "Project", req.ProjectId, project.Name,
            projectId: req.ProjectId);
        await activityRepository.AddAsync(actLog, ct);

        await unitOfWork.SaveChangesAsync(ct);

        var result = (IReadOnlyList<TaskDto>)created.Select(mapper.Map<TaskDto>).ToList();
        return Result<IReadOnlyList<TaskDto>>.Success(result);
    }
}
