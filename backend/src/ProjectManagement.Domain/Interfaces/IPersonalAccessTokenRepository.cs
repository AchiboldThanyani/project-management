using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Domain.Interfaces;

public interface IPersonalAccessTokenRepository
{
    Task<PersonalAccessToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default);
    Task<IReadOnlyList<PersonalAccessToken>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task AddAsync(PersonalAccessToken token, CancellationToken ct = default);
    Task DeleteAsync(Guid id, string userId, CancellationToken ct = default);
}
