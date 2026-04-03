using Microsoft.AspNetCore.SignalR;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.WebApi.Hubs;

public class TaskNotificationService(IHubContext<TaskHub> hubContext) : ITaskNotificationService
{
    public Task NotifyTaskStatusChanged(Guid taskId, Guid projectId, TaskStatus oldStatus, TaskStatus newStatus, CancellationToken cancellationToken = default)
        => hubContext.Clients
            .Group($"project-{projectId}")
            .SendAsync("TaskStatusChanged", new
            {
                taskId,
                projectId,
                oldStatus = (int)oldStatus,
                newStatus = (int)newStatus,
            }, cancellationToken);
}
