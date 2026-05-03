using MediatR;
using Microsoft.AspNetCore.Identity;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.Commands;
using ProjectManagement.Infrastructure.Identity;

namespace ProjectManagement.Infrastructure.Auth;

internal sealed class LogoutCommandHandler(UserManager<ApplicationUser> userManager)
    : IRequestHandler<LogoutCommand, Result>
{
    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user is null) return Result.Success();

        user.RefreshToken = null;
        user.PreviousRefreshToken = null;
        user.RefreshTokenExpiresAt = null;
        await userManager.UpdateAsync(user);

        return Result.Success();
    }
}
