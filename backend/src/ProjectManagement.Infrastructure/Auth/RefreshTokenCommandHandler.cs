using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.Commands;
using ProjectManagement.Application.Features.Auth.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Infrastructure.Identity;

namespace ProjectManagement.Infrastructure.Auth;

internal sealed class RefreshTokenCommandHandler(
    UserManager<ApplicationUser> userManager,
    IJwtTokenService jwtTokenService,
    IConfiguration configuration)
    : IRequestHandler<RefreshTokenCommand, Result<AuthResponseDto>>
{
    public async Task<Result<AuthResponseDto>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var user = userManager.Users.FirstOrDefault(u =>
            u.RefreshToken == request.RefreshToken);

        if (user is null)
        {
            // Check if this is a replayed (already-rotated) token — sign of theft
            var compromisedUser = userManager.Users.FirstOrDefault(u =>
                u.PreviousRefreshToken == request.RefreshToken);

            if (compromisedUser is not null)
            {
                // Revoke the active session for that user
                compromisedUser.RefreshToken = null;
                compromisedUser.PreviousRefreshToken = null;
                compromisedUser.RefreshTokenExpiresAt = null;
                await userManager.UpdateAsync(compromisedUser);
            }

            return Error.Unauthorized("Auth.InvalidRefreshToken", "Refresh token is invalid or expired.");
        }

        if (user.RefreshTokenExpiresAt < DateTime.UtcNow)
            return Error.Unauthorized("Auth.InvalidRefreshToken", "Refresh token is invalid or expired.");

        var accessToken = jwtTokenService.GenerateToken(user.Id, user.Email!, user.FirstName, user.LastName);
        var newRefreshToken = jwtTokenService.GenerateRefreshToken();
        var expiryDays = int.Parse(configuration["JwtSettings:RefreshTokenExpiryDays"] ?? "7");

        user.PreviousRefreshToken = user.RefreshToken;
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(expiryDays);
        await userManager.UpdateAsync(user);

        return new AuthResponseDto(accessToken, newRefreshToken, user.Id, user.Email!, user.FirstName, user.LastName);
    }
}
