using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tickets.UpdateTicketStatus;

public record UpdateTicketStatusCommand(
    Guid          TicketId,
    TicketStatus  Status,
    string?       AssignedToId = null
) : ICommand<TicketDto>;
