using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Invites.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Invites.GetInvitesByProject;

internal sealed class GetInvitesByProjectQueryHandler(IProjectInviteRepository invites)
    : IRequestHandler<GetInvitesByProjectQuery, Result<IReadOnlyList<InviteDto>>>
{
    public async Task<Result<IReadOnlyList<InviteDto>>> Handle(GetInvitesByProjectQuery req, CancellationToken ct)
    {
        var list = await invites.GetByProjectAsync(req.ProjectId, ct);
        return list.Select(i => new InviteDto
        {
            Id = i.Id, ProjectId = i.ProjectId, Token = i.Token,
            ExpiresAt = i.ExpiresAt, IsRevoked = i.IsRevoked, CreatedAt = i.CreatedAt,
        }).ToList();
    }
}
