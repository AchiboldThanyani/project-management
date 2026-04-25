using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.ActivateSprint;

internal sealed class ActivateSprintCommandHandler(
    ISprintRepository repository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<ActivateSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(ActivateSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(sprint.ProjectId, currentUser.UserId, ProjectMemberRole.Lead, cancellationToken))
            return Error.Forbidden("Sprint.Forbidden", "You must be a Lead or Manager to activate sprints.");

        // Deactivate any currently active sprint in the same project before activating this one
        var currentActive = await repository.GetActiveSprintForProjectAsync(sprint.ProjectId, cancellationToken);
        if (currentActive is not null && currentActive.Id != sprint.Id)
        {
            currentActive.Complete();
            await repository.UpdateAsync(currentActive, cancellationToken);
        }

        sprint.Activate();
        await repository.UpdateAsync(sprint, cancellationToken);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"activated sprint \"{sprint.Name}\"", "Sprint", sprint.Id, sprint.Name);
        await activityRepository.AddAsync(log, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<SprintDto>(sprint);
    }
}
