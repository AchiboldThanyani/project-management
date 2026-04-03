using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Interfaces;

public interface ITaskNotificationService
{
    Task NotifyTaskStatusChanged(Guid taskId, Guid projectId, TaskStatus oldStatus, TaskStatus newStatus, CancellationToken cancellationToken = default);
}
