using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.DeleteSprint;

internal sealed class DeleteSprintCommandHandler(
    ISprintRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteSprintCommand, Result>
{
    public async Task<Result> Handle(DeleteSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(sprint.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, cancellationToken))
            return Error.Forbidden("Sprint.Forbidden", "You must be a Manager to delete sprints.");

        await repository.DeleteAsync(sprint, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
