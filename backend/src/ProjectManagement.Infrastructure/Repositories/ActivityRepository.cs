using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class ActivityRepository(ApplicationDbContext context)
    : Repository<ActivityLog>(context), IActivityRepository
{
    private readonly ApplicationDbContext _context = context;

    public async Task<IReadOnlyList<ActivityLog>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => await _context.ActivityLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(count)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ActivityLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateTime since, CancellationToken ct = default)
        => await _context.ActivityLogs
            .Where(a => a.ProjectId == projectId && a.UserId == userId && a.CreatedAt >= since)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ActivityLog>> GetByProjectSinceAsync(
        Guid projectId, DateTime since, CancellationToken ct = default)
        => await _context.ActivityLogs
            .Where(a => a.ProjectId == projectId && a.CreatedAt >= since)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);
}
