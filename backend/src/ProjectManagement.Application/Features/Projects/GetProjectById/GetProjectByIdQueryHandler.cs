using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Projects.GetProjectById;

internal sealed class GetProjectByIdQueryHandler(
    IProjectRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IMapper mapper)
    : IRequestHandler<GetProjectByIdQuery, Result<ProjectDto>>
{
    public async Task<Result<ProjectDto>> Handle(GetProjectByIdQuery request, CancellationToken cancellationToken)
    {
        var project = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (project is null)
            return ProjectErrors.NotFound(request.Id);

        if (!await permissions.HasProjectRoleAsync(project.Id, currentUser.UserId, ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Project.Forbidden", "You do not have access to this project.");

        return mapper.Map<ProjectDto>(project);
    }
}
