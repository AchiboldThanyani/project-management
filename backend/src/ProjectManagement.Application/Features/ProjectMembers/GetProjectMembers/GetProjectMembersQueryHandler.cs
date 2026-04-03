using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMembers.GetProjectMembers;

internal sealed class GetProjectMembersQueryHandler(IProjectMemberRepository repo)
    : IRequestHandler<GetProjectMembersQuery, Result<IReadOnlyList<ProjectMemberDto>>>
{
    public async Task<Result<IReadOnlyList<ProjectMemberDto>>> Handle(
        GetProjectMembersQuery request, CancellationToken cancellationToken)
    {
        var members = await repo.GetByProjectAsync(request.ProjectId, cancellationToken);
        return Result<IReadOnlyList<ProjectMemberDto>>.Success(members);
    }
}
