using Microsoft.EntityFrameworkCore;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

internal sealed class PersonalAccessTokenRepository(ApplicationDbContext db) : IPersonalAccessTokenRepository
{
    public async Task<PersonalAccessToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default)
        => await db.PersonalAccessTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task<IReadOnlyList<PersonalAccessToken>> GetByUserAsync(string userId, CancellationToken ct = default)
        => await db.PersonalAccessTokens
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public async Task AddAsync(PersonalAccessToken token, CancellationToken ct = default)
        => await db.PersonalAccessTokens.AddAsync(token, ct);

    public async Task DeleteAsync(Guid id, string userId, CancellationToken ct = default)
    {
        var token = await db.PersonalAccessTokens
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (token is not null)
            db.PersonalAccessTokens.Remove(token);
    }
}
