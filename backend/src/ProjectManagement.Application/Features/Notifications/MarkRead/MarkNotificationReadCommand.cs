using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Notifications.MarkRead;

public sealed record MarkNotificationReadCommand(Guid NotificationId) : ICommand;
