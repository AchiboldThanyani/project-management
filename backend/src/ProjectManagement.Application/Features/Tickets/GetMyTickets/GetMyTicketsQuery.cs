using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;

namespace ProjectManagement.Application.Features.Tickets.GetMyTickets;

public record GetMyTicketsQuery(Guid? ProjectId = null) : IQuery<IReadOnlyList<TicketDto>>;
