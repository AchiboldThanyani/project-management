using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.Commands;
using ProjectManagement.Application.Features.Auth.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;
using ProjectManagement.Infrastructure.Identity;

namespace ProjectManagement.Infrastructure.Auth;

internal sealed class RegisterCommandHandler(
    UserManager<ApplicationUser> userManager,
    IJwtTokenService jwtTokenService,
    IProjectInviteRepository invites,
    ICustomerProjectAccessRepository access,
    IUnitOfWork unitOfWork,
    IConfiguration configuration)
    : IRequestHandler<RegisterCommand, Result<AuthResponseDto>>
{
    public async Task<Result<AuthResponseDto>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            return Error.Validation("Auth.EmailTaken", "Email is already taken.");

        ProjectInvite? invite = null;
        if (!string.IsNullOrWhiteSpace(request.InviteToken))
        {
            invite = await invites.GetByTokenAsync(request.InviteToken, cancellationToken);
            if (invite is null || !invite.IsValid())
                return Error.Validation("Auth.InvalidInvite", "Invite link is invalid or has expired.");
        }

        var role = invite is not null ? UserRole.Client : UserRole.Staff; // PM designation is admin-assigned only

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = role,
        };

        var identityResult = await userManager.CreateAsync(user, request.Password);
        if (!identityResult.Succeeded)
        {
            var description = string.Join("; ", identityResult.Errors.Select(e => e.Description));
            return Error.Validation("Auth.IdentityError", description);
        }

        if (invite is not null)
        {
            var customerAccess = CustomerProjectAccess.Create(user.Id, invite.ProjectId);
            await access.AddAsync(customerAccess, cancellationToken);
            invite.Revoke();
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var accessToken = jwtTokenService.GenerateToken(user.Id, user.Email!, user.FirstName, user.LastName, role.ToString());
        var refreshToken = jwtTokenService.GenerateRefreshToken();
        var expiryDays = int.Parse(configuration["JwtSettings:RefreshTokenExpiryDays"] ?? "7");

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(expiryDays);
        await userManager.UpdateAsync(user);

        return new AuthResponseDto(accessToken, refreshToken, user.Id, user.Email!, user.FirstName, user.LastName);
    }
}
