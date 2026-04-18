using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Invites.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Invites.GetInviteInfo;

internal sealed class GetInviteInfoQueryHandler(IProjectInviteRepository repo)
    : IRequestHandler<GetInviteInfoQuery, Result<InviteDto>>
{
    public async Task<Result<InviteDto>> Handle(GetInviteInfoQuery request, CancellationToken ct)
    {
        var invite = await repo.GetByTokenAsync(request.Token, ct);
        if (invite is null || !invite.IsValid())
            return Error.NotFound("Invite.NotFound", "Invite not found or has expired.");

        return new InviteDto { Id = invite.Id, ProjectId = invite.ProjectId,
            ProjectName = invite.Project.Name, Token = invite.Token,
            ExpiresAt = invite.ExpiresAt, CreatedAt = invite.CreatedAt };
    }
}
