using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;
using ProjectMemberRole = ProjectManagement.Domain.Enums.ProjectMemberRole;

namespace ProjectManagement.Application.Features.Sprints.CompleteSprint;

internal sealed class CompleteSprintCommandHandler(
    ISprintRepository repository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    IProjectMemberRepository memberRepository,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CompleteSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(CompleteSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(sprint.ProjectId, currentUser.UserId, ProjectMemberRole.Lead, cancellationToken))
            return Error.Forbidden("Sprint.Forbidden", "You must be a Lead or Manager to complete sprints.");

        // Validate carry-over target if provided
        if (request.TargetSprintId.HasValue)
        {
            var target = await repository.GetByIdAsync(request.TargetSprintId.Value, cancellationToken);
            if (target is null || target.ProjectId != sprint.ProjectId || target.IsCompleted)
                return SprintErrors.InvalidCarryOverTarget(request.TargetSprintId.Value);
        }

        // Find incomplete tasks in this sprint
        var (incompleteTasks, _) = await taskRepository.FindPagedAsync(
            t => t.SprintId == request.Id
              && t.Status != TaskStatus.Done
              && t.Status != TaskStatus.Cancelled,
            1, 1000, cancellationToken);

        var carryOverCount = incompleteTasks.Count;

        // Move incomplete tasks
        if (carryOverCount > 0)
        {
            var taskIds = incompleteTasks.Select(t => t.Id);
            await taskRepository.BulkUpdateSprintAsync(taskIds, request.TargetSprintId, cancellationToken);
        }

        sprint.Complete(request.RetroNotes);
        await repository.UpdateAsync(sprint, cancellationToken);

        var destination = request.TargetSprintId.HasValue
            ? $"Sprint {request.TargetSprintId.Value}"
            : "backlog";

        var activityMsg = carryOverCount > 0
            ? $"completed sprint \"{sprint.Name}\" — {carryOverCount} task(s) moved to {destination}"
            : $"completed sprint \"{sprint.Name}\"";

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            activityMsg, "Sprint", sprint.Id, sprint.Name);
        await activityRepository.AddAsync(log, cancellationToken);

        // Stage notification entities for all project members except the completer
        var memberIds = await memberRepository.GetMemberUserIdsAsync(sprint.ProjectId, cancellationToken);
        var recipients = memberIds.Where(id => id != currentUser.UserId).ToList();

        foreach (var memberId in recipients)
        {
            var n = Notification.Create(
                userId: memberId,
                title: "Sprint completed",
                body: $"Sprint \"{sprint.Name}\" has been completed",
                type: NotificationType.SprintCompleted,
                relatedEntityId: sprint.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Fire real-time pushes after DB rows exist
        foreach (var memberId in recipients)
        {
            await notificationService.NotifyUser(
                memberId, "Sprint completed",
                $"Sprint \"{sprint.Name}\" has been completed",
                NotificationType.SprintCompleted, sprint.Id, cancellationToken);
        }

        var dto = mapper.Map<SprintDto>(sprint);
        return dto with { CarryOverCount = carryOverCount };
    }
}
