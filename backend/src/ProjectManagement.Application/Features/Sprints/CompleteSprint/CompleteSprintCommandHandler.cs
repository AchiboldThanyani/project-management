using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Sprints.CompleteSprint;

internal sealed class CompleteSprintCommandHandler(
    ISprintRepository repository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CompleteSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(CompleteSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        // Count incomplete tasks still in this sprint
        var (allTasks, _) = await taskRepository.FindPagedAsync(
            t => t.SprintId == request.Id
              && t.Status != TaskStatus.Done
              && t.Status != TaskStatus.Cancelled,
            1, 1000, cancellationToken);

        var carryOverCount = allTasks.Count;

        sprint.Complete(request.RetroNotes);
        await repository.UpdateAsync(sprint, cancellationToken);

        var activityMsg = carryOverCount > 0
            ? $"completed sprint \"{sprint.Name}\" with {carryOverCount} task(s) carried over"
            : $"completed sprint \"{sprint.Name}\"";

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            activityMsg, "Sprint", sprint.Id, sprint.Name);
        await activityRepository.AddAsync(log, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = mapper.Map<SprintDto>(sprint);
        return dto with { CarryOverCount = carryOverCount };
    }
}
