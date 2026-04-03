using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Events;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.EventHandlers;

internal sealed class TaskStatusChangedEventHandler(
    IActivityRepository activityRepository,
    IUserRepository userRepository,
    ITaskNotificationService notificationService,
    IUnitOfWork unitOfWork)
    : INotificationHandler<DomainEventNotification<TaskStatusChangedEvent>>
{
    private static readonly string[] StatusLabels = ["To Do", "In Progress", "In Review", "Done", "Blocked", "Cancelled"];

    public async Task Handle(DomainEventNotification<TaskStatusChangedEvent> notification, CancellationToken cancellationToken)
    {
        var e = notification.DomainEvent;
        var user = await userRepository.GetUserByIdAsync(e.ChangedByUserId, cancellationToken);
        var userName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        var statusLabel = (int)e.NewStatus < StatusLabels.Length ? StatusLabels[(int)e.NewStatus] : e.NewStatus.ToString();

        var log = ActivityLog.Create(e.ChangedByUserId, userName,
            $"moved \"{e.TaskTitle}\" to {statusLabel}", "Task", e.TaskId, e.TaskTitle);

        await activityRepository.AddAsync(log, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Push real-time update via SignalR
        await notificationService.NotifyTaskStatusChanged(e.TaskId, e.ProjectId, e.OldStatus, e.NewStatus, cancellationToken);
    }
}
