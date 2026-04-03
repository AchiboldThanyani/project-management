using ProjectManagement.Application.Features.Users.DTOs;

namespace ProjectManagement.Application.Interfaces;

public interface IUserRepository
{
    Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default);
}
