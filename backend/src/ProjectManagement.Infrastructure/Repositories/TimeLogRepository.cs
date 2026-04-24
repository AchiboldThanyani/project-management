using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TimeLogRepository(ApplicationDbContext db) : ITimeLogRepository
{
    public Task<TimeLog?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.TimeLogs.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IReadOnlyList<TimeLog>> GetByTaskIdAsync(Guid taskId, CancellationToken ct = default)
        => await db.TimeLogs.Where(t => t.TaskId == taskId).OrderByDescending(t => t.LoggedDate).ToListAsync(ct);

    public async Task AddAsync(TimeLog log, CancellationToken ct = default)
        => await db.TimeLogs.AddAsync(log, ct);

    public void Remove(TimeLog log)
        => db.TimeLogs.Remove(log);

    public Task SaveAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
