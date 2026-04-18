using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ProjectManagement.Application.Features.Auth.Commands;
using ProjectManagement.Application.Features.Auth.DTOs;
using ProjectManagement.Infrastructure.Identity;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IMediator mediator, UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto, CancellationToken ct)
        => (await mediator.Send(new RegisterCommand(dto.FirstName, dto.LastName, dto.Email, dto.Password, dto.InviteToken), ct)).ToActionResult(this);

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto, CancellationToken ct)
        => (await mediator.Send(new LoginCommand(dto.Email, dto.Password), ct)).ToActionResult(this);

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenDto dto, CancellationToken ct)
        => (await mediator.Send(new RefreshTokenCommand(dto.RefreshToken), ct)).ToActionResult(this);

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> GetMe(CancellationToken ct)
    {
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (userId is null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();

        return Ok(new UserProfileDto(user.Id, user.Email!, user.FirstName, user.LastName));
    }
}

public record UserProfileDto(string Id, string Email, string FirstName, string LastName);
public record RefreshTokenDto(string RefreshToken);
