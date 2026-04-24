using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Notifications.GetMyNotifications;

public sealed record GetMyNotificationsQuery : IQuery<IReadOnlyList<NotificationDto>>;
