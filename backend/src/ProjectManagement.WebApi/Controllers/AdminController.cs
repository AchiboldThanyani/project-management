using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Users.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(IUserRepository users) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetUsers(CancellationToken ct)
        => Ok(await users.GetAllUsersAsync(ct));

    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> ChangeRole(string userId, [FromBody] ChangeUserRoleBody body, CancellationToken ct)
    {
        var ok = await users.ChangeUserRoleAsync(userId, body.Role, ct);
        if (!ok) return NotFound(new { Code = "User.NotFound", Description = "User not found." });
        return NoContent();
    }
}

public record ChangeUserRoleBody(UserRole Role);
