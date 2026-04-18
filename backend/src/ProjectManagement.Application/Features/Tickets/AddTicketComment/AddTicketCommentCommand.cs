using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;

namespace ProjectManagement.Application.Features.Tickets.AddTicketComment;

public record AddTicketCommentCommand(Guid TicketId, string Content) : ICommand<TicketCommentDto>;
