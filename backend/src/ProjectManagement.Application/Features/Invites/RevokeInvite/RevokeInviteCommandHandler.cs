using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Invites.RevokeInvite;

internal sealed class RevokeInviteCommandHandler(IProjectInviteRepository repo, IUnitOfWork uow)
    : IRequestHandler<RevokeInviteCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(RevokeInviteCommand request, CancellationToken ct)
    {
        var invite = await repo.GetByIdAsync(request.InviteId, ct);
        if (invite is null) return Error.NotFound("Invite.NotFound", "Invite not found.");
        invite.Revoke();
        await uow.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
