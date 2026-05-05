using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.PersonalTokens.Commands.RevokeToken;

internal sealed class RevokePersonalAccessTokenCommandHandler(
    IPersonalAccessTokenRepository repository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<RevokePersonalAccessTokenCommand, Result>
{
    public async Task<Result> Handle(RevokePersonalAccessTokenCommand request, CancellationToken cancellationToken)
    {
        await repository.DeleteAsync(request.TokenId, currentUser.UserId, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
