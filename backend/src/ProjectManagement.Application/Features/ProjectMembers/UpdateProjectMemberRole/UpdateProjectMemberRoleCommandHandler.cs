using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMembers.UpdateProjectMemberRole;

internal sealed class UpdateProjectMemberRoleCommandHandler(
    IProjectMemberRepository repo,
    IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateProjectMemberRoleCommand, Result<ProjectMemberDto>>
{
    public async Task<Result<ProjectMemberDto>> Handle(
        UpdateProjectMemberRoleCommand request, CancellationToken cancellationToken)
    {
        var members = await repo.FindAsync(
            m => m.ProjectId == request.ProjectId && m.UserId == request.UserId, cancellationToken);

        if (members.Count == 0)
            return Error.NotFound("ProjectMember.NotFound", "Member not found on this project.");

        members[0].UpdateRole(request.Role);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = await repo.GetDtoByIdAsync(members[0].Id, cancellationToken);
        return dto ?? new ProjectMemberDto
        {
            Id = members[0].Id, ProjectId = members[0].ProjectId,
            UserId = members[0].UserId, Role = members[0].Role,
        };
    }
}
