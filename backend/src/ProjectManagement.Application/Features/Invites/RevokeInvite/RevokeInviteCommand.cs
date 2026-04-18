using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Invites.RevokeInvite;
public record RevokeInviteCommand(Guid InviteId) : IRequest<Result<Unit>>;
