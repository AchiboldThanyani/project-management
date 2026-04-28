using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Events;
using ProjectManagement.Domain.Interfaces;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Tasks.EventHandlers;

internal sealed class TaskStatusChangedEventHandler(
    IActivityRepository activityRepository,
    INotificationRepository notificationRepo,
    IUserRepository userRepository,
    INotificationService notificationService,
    IUnitOfWork unitOfWork)
    : INotificationHandler<DomainEventNotification<TaskStatusChangedEvent>>
{
    private static readonly string[] StatusLabels = ["To Do", "In Progress", "In Review", "Done", "Blocked", "Cancelled"];

    public async Task Handle(DomainEventNotification<TaskStatusChangedEvent> notification, CancellationToken ct)
    {
        var e = notification.DomainEvent;
        var user = await userRepository.GetUserByIdAsync(e.ChangedByUserId, ct);
        var userName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown";
        var statusLabel = (int)e.NewStatus < StatusLabels.Length ? StatusLabels[(int)e.NewStatus] : e.NewStatus.ToString();

        var log = ActivityLog.Create(e.ChangedByUserId, userName,
            $"moved \"{e.TaskTitle}\" to {statusLabel}", "Task", e.TaskId, e.TaskTitle,
            projectId: e.ProjectId);
        await activityRepository.AddAsync(log, ct);

        if (e.NewStatus == TaskStatus.Blocked)
        {
            var n = Notification.Create(
                userId: e.ChangedByUserId,
                title: "Task blocked",
                body: $"\"{e.TaskTitle}\" was marked as Blocked",
                type: NotificationType.TaskBlocked,
                relatedEntityId: e.TaskId);
            await notificationRepo.AddAsync(n, ct);
        }

        await unitOfWork.SaveChangesAsync(ct);
        await notificationService.NotifyTaskStatusChanged(e.TaskId, e.ProjectId, e.OldStatus, e.NewStatus, ct);

        if (e.NewStatus == TaskStatus.Blocked)
        {
            await notificationService.NotifyUser(
                e.ChangedByUserId, "Task blocked",
                $"\"{e.TaskTitle}\" was marked as Blocked",
                NotificationType.TaskBlocked, e.TaskId, ct);
        }
    }
}
