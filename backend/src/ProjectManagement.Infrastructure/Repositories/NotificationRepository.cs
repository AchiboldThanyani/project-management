using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class NotificationRepository(ApplicationDbContext db) : INotificationRepository
{
    public async Task AddAsync(Notification notification, CancellationToken ct = default)
        => await db.Notifications.AddAsync(notification, ct);

    public Task<IReadOnlyList<Notification>> GetUnreadForUserAsync(string userId, CancellationToken ct = default)
        => db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync(ct)
            .ContinueWith(t => (IReadOnlyList<Notification>)t.Result, ct);

    public Task<int> GetUnreadCountAsync(string userId, CancellationToken ct = default)
        => db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public Task<Notification?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Notifications.FirstOrDefaultAsync(n => n.Id == id, ct);

    public Task SaveAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
