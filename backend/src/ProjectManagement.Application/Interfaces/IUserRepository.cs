using ProjectManagement.Application.Features.Users.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Interfaces;

public interface IUserRepository
{
    Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, string>> GetNamesByIdsAsync(IEnumerable<string> userIds, CancellationToken ct = default);
    Task<UserRole> GetRoleAsync(string userId, CancellationToken ct = default);
}
