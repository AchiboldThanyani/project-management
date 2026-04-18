using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;

namespace ProjectManagement.Application.Features.Tickets.GetTicketComments;

public record GetTicketCommentsQuery(Guid TicketId) : IQuery<IReadOnlyList<TicketCommentDto>>;
