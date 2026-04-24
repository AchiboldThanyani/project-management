using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Notifications;
using ProjectManagement.Application.Features.Notifications.GetMyNotifications;
using ProjectManagement.Application.Features.Notifications.MarkRead;
using ProjectManagement.Application.Features.Notifications.MarkAllRead;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> GetMy(CancellationToken ct)
        => (await mediator.Send(new GetMyNotificationsQuery(), ct)).ToActionResult(this);

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
        => (await mediator.Send(new MarkNotificationReadCommand(id), ct)).ToActionResult(this);

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
        => (await mediator.Send(new MarkAllReadCommand(), ct)).ToActionResult(this);
}
