using Microsoft.AspNetCore.SignalR;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.WebApi.Hubs;

public class NotificationService(IHubContext<TaskHub> hubContext) : INotificationService
{
    public Task NotifyTaskStatusChanged(Guid taskId, Guid projectId, TaskStatus oldStatus, TaskStatus newStatus, CancellationToken ct = default)
        => hubContext.Clients
            .Group($"project-{projectId}")
            .SendAsync("TaskStatusChanged", new { taskId, projectId, oldStatus = (int)oldStatus, newStatus = (int)newStatus }, ct);

    public Task NotifyTaskAssigned(Guid taskId, string taskTitle, Guid projectId, string assigneeId, CancellationToken ct = default)
        => hubContext.Clients
            .Group($"user-{assigneeId}")
            .SendAsync("TaskAssigned", new { taskId, taskTitle, projectId }, ct);

    public Task NotifyTaskOverdue(Guid taskId, string taskTitle, Guid projectId, string? assigneeId, CancellationToken ct = default)
    {
        if (assigneeId is null) return Task.CompletedTask;
        return hubContext.Clients
            .Group($"user-{assigneeId}")
            .SendAsync("TaskOverdue", new { taskId, taskTitle, projectId }, ct);
    }

    public Task NotifyUser(string userId, string title, string body, NotificationType type, Guid? relatedEntityId = null, CancellationToken ct = default)
        => hubContext.Clients
            .Group($"user-{userId}")
            .SendAsync("Notification", new { title, body, type = (int)type, relatedEntityId }, ct);
}
