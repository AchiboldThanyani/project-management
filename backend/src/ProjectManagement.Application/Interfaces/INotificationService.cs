using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Interfaces;

public interface INotificationService
{
    Task NotifyTaskStatusChanged(Guid taskId, Guid projectId, TaskStatus oldStatus, TaskStatus newStatus, CancellationToken ct = default);
    Task NotifyTaskAssigned(Guid taskId, string taskTitle, Guid projectId, string assigneeId, CancellationToken ct = default);
    Task NotifyTaskOverdue(Guid taskId, string taskTitle, Guid projectId, string? assigneeId, CancellationToken ct = default);
    Task NotifyUser(string userId, string title, string body, NotificationType type, Guid? relatedEntityId = null, CancellationToken ct = default);
}
