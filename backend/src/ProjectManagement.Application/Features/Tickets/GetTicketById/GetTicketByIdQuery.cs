using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;

namespace ProjectManagement.Application.Features.Tickets.GetTicketById;

public record GetTicketByIdQuery(Guid TicketId) : IQuery<TicketDto>;
