using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tickets.SubmitTicket;

public record SubmitTicketCommand(
    Guid        ProjectId,
    string      Subject,
    string?     Description,
    TicketType  Type,
    TaskPriority Priority
) : ICommand<TicketDto>;
