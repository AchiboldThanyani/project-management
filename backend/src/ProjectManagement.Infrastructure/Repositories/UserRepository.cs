using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Features.Users.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Identity;

namespace ProjectManagement.Infrastructure.Repositories;

public class UserRepository(UserManager<ApplicationUser> userManager) : IUserRepository
{
    public Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        var users = userManager.Users
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email!,
                FirstName = u.FirstName,
                LastName = u.LastName
            })
            .ToList();

        return Task.FromResult<IReadOnlyList<UserDto>>(users);
    }

    public async Task<UserDto?> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return null;
        return new UserDto { Id = u.Id, Email = u.Email!, FirstName = u.FirstName, LastName = u.LastName };
    }

    public async Task<Dictionary<string, string>> GetNamesByIdsAsync(IEnumerable<string> userIds, CancellationToken ct = default)
    {
        var ids = userIds.ToList();
        return await userManager.Users
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), ct);
    }

    public async Task<UserRole> GetRoleAsync(string userId, CancellationToken ct = default)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        return user?.Role ?? UserRole.Internal;
    }
}
