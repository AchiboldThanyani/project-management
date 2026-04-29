using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TimeLogRepository(ApplicationDbContext db)
    : Repository<TimeLog>(db), ITimeLogRepository
{
    public async Task<IReadOnlyList<TimeLog>> GetByTaskIdAsync(Guid taskId, CancellationToken ct = default)
        => await db.TimeLogs.Where(t => t.TaskId == taskId).OrderByDescending(t => t.LoggedDate).ToListAsync(ct);

    public async Task<IReadOnlyList<TimeLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateOnly date, CancellationToken ct = default)
        => await db.TimeLogs
            .Where(t => t.UserId == userId && t.LoggedDate == date
                && db.Tasks.Any(task => task.Id == t.TaskId && task.ProjectId == projectId))
            .ToListAsync(ct);

    public void Remove(TimeLog log)
        => db.TimeLogs.Remove(log);

    public Task SaveAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
