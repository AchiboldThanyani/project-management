using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class StandupReportRepository(ApplicationDbContext db)
    : Repository<StandupReport>(db), IStandupReportRepository
{
    public async Task<IReadOnlyList<StandupReport>> GetByProjectAsync(
        Guid projectId, int count, CancellationToken ct = default)
        => await db.StandupReports
            .Where(r => r.ProjectId == projectId)
            .OrderByDescending(r => r.GeneratedAt)
            .Take(count)
            .ToListAsync(ct);
}
