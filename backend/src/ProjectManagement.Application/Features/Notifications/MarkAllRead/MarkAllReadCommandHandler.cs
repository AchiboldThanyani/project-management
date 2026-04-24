using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Notifications.MarkAllRead;

internal sealed class MarkAllReadCommandHandler(
    INotificationRepository notifications,
    ICurrentUserService currentUser)
    : IRequestHandler<MarkAllReadCommand, Result>
{
    public async Task<Result> Handle(MarkAllReadCommand _, CancellationToken ct)
    {
        var items = await notifications.GetUnreadForUserAsync(currentUser.UserId!, ct);
        foreach (var n in items) n.MarkRead();
        await notifications.SaveAsync(ct);
        return Result.Success();
    }
}
