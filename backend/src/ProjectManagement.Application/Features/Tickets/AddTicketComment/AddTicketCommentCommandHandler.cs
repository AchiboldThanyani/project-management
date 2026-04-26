using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.AddTicketComment;

internal sealed class AddTicketCommentCommandHandler(
    ITicketRepository        tickets,
    ITicketCommentRepository comments,
    ICurrentUserService      currentUser,
    IUserRepository          users,
    INotificationRepository  notifications,
    INotificationService     notificationService,
    IUnitOfWork              unitOfWork)
    : IRequestHandler<AddTicketCommentCommand, Result<TicketCommentDto>>
{
    public async Task<Result<TicketCommentDto>> Handle(AddTicketCommentCommand req, CancellationToken ct)
    {
        var ticket = await tickets.GetByIdAsync(req.TicketId, ct);
        if (ticket is null)
            return Error.NotFound("Ticket.NotFound", "Ticket not found.");

        var role = await users.GetRoleAsync(currentUser.UserId, ct);
        var isFromCustomer = role == UserRole.Client;

        var comment = TicketComment.Create(req.TicketId, currentUser.UserId, req.Content, isFromCustomer);
        await comments.AddAsync(comment, ct);

        // Notify the assigned agent when a client replies
        if (isFromCustomer && ticket.AssignedToId is not null)
        {
            var title = "Client Reply";
            var body  = $"{currentUser.FullName} replied on ticket #{ticket.Number}: \"{ticket.Subject}\"";
            var notification = Notification.Create(
                ticket.AssignedToId, title, body,
                NotificationType.TicketReplied, ticket.Id);
            await notifications.AddAsync(notification, ct);
            await unitOfWork.SaveChangesAsync(ct);
            await notificationService.NotifyUser(ticket.AssignedToId, title, body, NotificationType.TicketReplied, ticket.Id, ct);
        }
        else
        {
            await unitOfWork.SaveChangesAsync(ct);
        }

        return new TicketCommentDto
        {
            Id = comment.Id, TicketId = comment.TicketId,
            AuthorId = comment.AuthorId, AuthorName = currentUser.FullName,
            Content = comment.Content, IsFromCustomer = comment.IsFromCustomer,
            CreatedAt = comment.CreatedAt,
        };
    }
}
