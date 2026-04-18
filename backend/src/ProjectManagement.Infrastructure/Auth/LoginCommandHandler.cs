using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.Commands;
using ProjectManagement.Application.Features.Auth.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Infrastructure.Identity;

namespace ProjectManagement.Infrastructure.Auth;

internal sealed class LoginCommandHandler(
    UserManager<ApplicationUser> userManager,
    IJwtTokenService jwtTokenService,
    IConfiguration configuration)
    : IRequestHandler<LoginCommand, Result<AuthResponseDto>>
{
    public async Task<Result<AuthResponseDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return Error.Validation("Auth.InvalidCredentials", "Invalid email or password.");

        var passwordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
            return Error.Validation("Auth.InvalidCredentials", "Invalid email or password.");

        var accessToken = jwtTokenService.GenerateToken(user.Id, user.Email!, user.FirstName, user.LastName, user.Role.ToString());
        var refreshToken = jwtTokenService.GenerateRefreshToken();
        var expiryDays = int.Parse(configuration["JwtSettings:RefreshTokenExpiryDays"] ?? "7");

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(expiryDays);
        await userManager.UpdateAsync(user);

        return new AuthResponseDto(accessToken, refreshToken, user.Id, user.Email!, user.FirstName, user.LastName);
    }
}
