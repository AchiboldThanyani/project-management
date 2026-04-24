using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Persistence;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Infrastructure.BackgroundServices;

public class OverdueTaskScannerService(IServiceScopeFactory scopeFactory, ILogger<OverdueTaskScannerService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(15), ct);
            try { await ScanAsync(ct); }
            catch (Exception ex) { logger.LogError(ex, "Overdue task scan failed"); }
        }
    }

    private async Task ScanAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notificationRepo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;
        var overdueTasks = await db.Tasks
            .Where(t => t.DueDate.HasValue
                     && t.DueDate < now
                     && t.Status != TaskStatus.Done
                     && t.Status != TaskStatus.Cancelled
                     && t.AssigneeId != null)
            .ToListAsync(ct);

        foreach (var task in overdueTasks)
        {
            var alreadyNotified = await db.Notifications
                .AnyAsync(n => n.RelatedEntityId == task.Id
                            && n.Type == NotificationType.TaskOverdue
                            && n.CreatedAt > now.AddHours(-24), ct);
            if (alreadyNotified) continue;

            var n = Notification.Create(
                userId: task.AssigneeId!,
                title: "Task overdue",
                body: $"\"{task.Title}\" was due {task.DueDate!.Value:MMM d} and is still open",
                type: NotificationType.TaskOverdue,
                relatedEntityId: task.Id);

            await notificationRepo.AddAsync(n, ct);
            await notificationRepo.SaveAsync(ct);
            await notificationService.NotifyUser(task.AssigneeId!, n.Title, n.Body, NotificationType.TaskOverdue, task.Id, ct);
        }

        logger.LogDebug("Overdue scan: {Count} tasks processed", overdueTasks.Count);
    }
}
