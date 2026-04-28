using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class StandupSettingsRepository(ApplicationDbContext db)
    : Repository<StandupSettings>(db), IStandupSettingsRepository
{
    public async Task<StandupSettings?> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await db.StandupSettings.FirstOrDefaultAsync(s => s.ProjectId == projectId, ct);

    public async Task<IReadOnlyList<StandupSettings>> GetEnabledAsync(CancellationToken ct = default)
        => await db.StandupSettings.Where(s => s.IsEnabled).ToListAsync(ct);
}
