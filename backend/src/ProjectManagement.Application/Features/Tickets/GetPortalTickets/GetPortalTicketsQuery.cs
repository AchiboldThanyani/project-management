using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;

namespace ProjectManagement.Application.Features.Tickets.GetPortalTickets;

public record GetPortalTicketsQuery : IQuery<IReadOnlyList<TicketDto>>;
