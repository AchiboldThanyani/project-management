using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Notifications.MarkRead;

internal sealed class MarkNotificationReadCommandHandler(
    INotificationRepository notifications)
    : IRequestHandler<MarkNotificationReadCommand, Result>
{
    public async Task<Result> Handle(MarkNotificationReadCommand req, CancellationToken ct)
    {
        var n = await notifications.GetByIdAsync(req.NotificationId, ct);
        if (n is null) return Result.Success();
        n.MarkRead();
        await notifications.SaveAsync(ct);
        return Result.Success();
    }
}
