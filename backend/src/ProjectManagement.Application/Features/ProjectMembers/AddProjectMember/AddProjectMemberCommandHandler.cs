using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMembers.AddProjectMember;

internal sealed class AddProjectMemberCommandHandler(
    IProjectMemberRepository repo,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddProjectMemberCommand, Result<ProjectMemberDto>>
{
    public async Task<Result<ProjectMemberDto>> Handle(
        AddProjectMemberCommand request, CancellationToken cancellationToken)
    {
        var existing = await repo.FindAsync(
            m => m.ProjectId == request.ProjectId && m.UserId == request.UserId, cancellationToken);

        if (existing.Count > 0)
            return Error.Conflict("ProjectMember.AlreadyExists", "User is already a member of this project.");

        var member = ProjectMember.Create(request.ProjectId, request.UserId, request.Role);
        await repo.AddAsync(member, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = await repo.GetDtoByIdAsync(member.Id, cancellationToken);
        return dto ?? new ProjectMemberDto
        {
            Id = member.Id, ProjectId = member.ProjectId,
            UserId = member.UserId, Role = member.Role, JoinedAt = member.CreatedAt,
        };
    }
}
