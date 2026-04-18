using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tickets.GetTicketsByProject;

public record GetTicketsByProjectQuery(
    Guid          ProjectId,
    TicketStatus? Status = null
) : IQuery<IReadOnlyList<TicketDto>>;
