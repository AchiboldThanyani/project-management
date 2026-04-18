using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Invites.DTOs;

namespace ProjectManagement.Application.Features.Invites.GetInvitesByProject;

public record GetInvitesByProjectQuery(Guid ProjectId) : IQuery<IReadOnlyList<InviteDto>>;
