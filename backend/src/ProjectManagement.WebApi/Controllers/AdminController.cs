using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Users.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Authorization;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/admin")]
[AuthorizeRoles(UserRole.Admin)]
public class AdminController(IUserRepository users) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetUsers(CancellationToken ct)
        => Ok(await users.GetAllUsersAsync(ct));

    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> ChangeRole(string userId, [FromBody] ChangeUserRoleBody body, CancellationToken ct)
    {
        var target = (await users.GetAllUsersAsync(ct)).FirstOrDefault(u => u.Id == userId);
        if (target is null) return NotFound(new { Code = "User.NotFound", Description = "User not found." });

        // Clients are external users — their account type cannot be changed
        if (target.Role == UserRole.Client)
            return BadRequest(new { Code = "User.ClientLocked", Description = "Client account type cannot be changed." });

        // Staff ↔ Admin only; cannot assign Client via API
        if (body.Role == UserRole.Client)
            return BadRequest(new { Code = "User.InvalidRole", Description = "Cannot assign Client role through admin panel." });

        var ok = await users.ChangeUserRoleAsync(userId, body.Role, ct);
        if (!ok) return NotFound(new { Code = "User.NotFound", Description = "User not found." });
        return NoContent();
    }
}

public record ChangeUserRoleBody(UserRole Role);
