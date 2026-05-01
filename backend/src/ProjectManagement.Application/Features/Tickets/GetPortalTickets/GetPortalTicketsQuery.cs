using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.GetPortalTickets;

public record GetPortalTicketsQuery : IQuery<IReadOnlyList<TicketDto>>;
