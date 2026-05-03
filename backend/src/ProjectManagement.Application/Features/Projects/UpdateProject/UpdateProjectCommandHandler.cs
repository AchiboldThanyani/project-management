using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Projects.UpdateProject;

internal sealed class UpdateProjectCommandHandler(
    IProjectRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateProjectCommand, Result<ProjectDto>>
{
    public async Task<Result<ProjectDto>> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (project is null)
            return ProjectErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(project.Id, currentUser.UserId, ProjectMemberRole.Manager, cancellationToken))
            return Error.Forbidden("Project.Forbidden", "You must be a project manager to update this project.");

        project.Update(request.Name, request.Description, request.Status, request.StartDate, request.EndDate);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<ProjectDto>(project);
    }
}
