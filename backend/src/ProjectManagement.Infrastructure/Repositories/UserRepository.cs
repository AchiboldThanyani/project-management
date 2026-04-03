using Microsoft.AspNetCore.Identity;
using ProjectManagement.Application.Features.Users.DTOs;
using ProjectManagement.Application.Interfaces;
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
}
