using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Events;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.EventHandlers;

internal sealed class TaskAssignedEventHandler(
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork)
    : INotificationHandler<DomainEventNotification<TaskAssignedEvent>>
{
    public async Task Handle(DomainEventNotification<TaskAssignedEvent> notification, CancellationToken ct)
    {
        var e = notification.DomainEvent;
        var assigner = await userRepository.GetUserByIdAsync(e.AssignedByUserId, ct);
        var assignerName = assigner is not null ? $"{assigner.FirstName} {assigner.LastName}" : "Someone";

        var n = Notification.Create(
            userId: e.AssigneeId,
            title: "Task assigned to you",
            body: $"{assignerName} assigned \"{e.TaskTitle}\" to you",
            type: NotificationType.TaskAssigned,
            relatedEntityId: e.TaskId);

        await notificationRepo.AddAsync(n, ct);
        await unitOfWork.SaveChangesAsync(ct);

        await notificationService.NotifyTaskAssigned(e.TaskId, e.TaskTitle, e.ProjectId, e.AssigneeId, ct);
        await notificationService.NotifyUser(e.AssigneeId, n.Title, n.Body, NotificationType.TaskAssigned, e.TaskId, ct);
    }
}
