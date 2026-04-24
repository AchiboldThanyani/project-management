using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Notifications.GetMyNotifications;

internal sealed class GetMyNotificationsQueryHandler(
    INotificationRepository notifications,
    ICurrentUserService currentUser)
    : IRequestHandler<GetMyNotificationsQuery, Result<IReadOnlyList<NotificationDto>>>
{
    public async Task<Result<IReadOnlyList<NotificationDto>>> Handle(GetMyNotificationsQuery _, CancellationToken ct)
    {
        var items = await notifications.GetUnreadForUserAsync(currentUser.UserId!, ct);
        var dtos = items.Select(n => new NotificationDto(
            n.Id, n.Title, n.Body, n.Type, n.RelatedEntityId, n.IsRead, n.CreatedAt))
            .ToList();
        return Result<IReadOnlyList<NotificationDto>>.Success(dtos);
    }
}
