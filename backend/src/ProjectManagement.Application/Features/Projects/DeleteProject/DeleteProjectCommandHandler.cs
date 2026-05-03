using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Projects.DeleteProject;

internal sealed class DeleteProjectCommandHandler(
    IProjectRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteProjectCommand, Result>
{
    public async Task<Result> Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (project is null)
            return ProjectErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(project.Id, currentUser.UserId, ProjectMemberRole.Manager, cancellationToken))
            return Error.Forbidden("Project.Forbidden", "You must be a project manager to delete this project.");

        await repository.DeleteAsync(project, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
