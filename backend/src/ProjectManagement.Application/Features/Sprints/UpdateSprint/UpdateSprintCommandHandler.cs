using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.UpdateSprint;

internal sealed class UpdateSprintCommandHandler(
    ISprintRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(UpdateSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(sprint.ProjectId, currentUser.UserId, ProjectMemberRole.Lead, cancellationToken))
            return Error.Forbidden("Sprint.Forbidden", "You must be a Lead or Manager to update sprints.");

        sprint.Update(request.Name, request.Goal, request.StartDate, request.EndDate);
        await repository.UpdateAsync(sprint, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<SprintDto>(sprint);
    }
}
