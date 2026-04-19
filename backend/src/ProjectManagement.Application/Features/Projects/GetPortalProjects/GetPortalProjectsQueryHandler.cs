using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Projects.GetPortalProjects;

internal sealed class GetPortalProjectsQueryHandler(
    ICustomerProjectAccessRepository access,
    IProjectRepository projects,
    ICurrentUserService currentUser)
    : IRequestHandler<GetPortalProjectsQuery, Result<IReadOnlyList<ProjectDto>>>
{
    public async Task<Result<IReadOnlyList<ProjectDto>>> Handle(GetPortalProjectsQuery _, CancellationToken ct)
    {
        var accesses = await access.GetByUserAsync(currentUser.UserId, ct);

        var result = new List<ProjectDto>();
        foreach (var a in accesses)
        {
            var p = await projects.GetByIdAsync(a.ProjectId, ct);
            if (p is not null)
                result.Add(new ProjectDto
                {
                    Id = p.Id, Name = p.Name, Description = p.Description,
                    Status = p.Status, OwnerId = p.OwnerId, CreatedAt = p.CreatedAt,
                });
        }
        return result;
    }
}
