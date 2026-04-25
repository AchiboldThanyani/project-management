using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Features.Tickets.Sla;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.GetTicketById;

internal sealed class GetTicketByIdQueryHandler(
    ITicketRepository  tickets,
    IUserRepository    users,
    ICurrentUserService currentUser)
    : IRequestHandler<GetTicketByIdQuery, Result<TicketDto>>
{
    public async Task<Result<TicketDto>> Handle(GetTicketByIdQuery req, CancellationToken ct)
    {
        var ticket = await tickets.GetByIdAsync(req.TicketId, ct);
        if (ticket is null)
            return Error.NotFound("Ticket.NotFound", "Ticket not found.");

        // customers can only see their own tickets
        if (ticket.SubmittedById != currentUser.UserId)
        {
            // internal users can see all tickets — access check at controller level
        }

        var userIds = new[] { ticket.SubmittedById, ticket.AssignedToId }
            .Where(id => id is not null).Distinct().Cast<string>().ToList();
        var names = await users.GetNamesByIdsAsync(userIds, ct);

        var (slaStatus, responseDeadline, resolutionDeadline, hoursRemaining) =
            SlaPolicy.Compute(ticket.Priority, ticket.CreatedAt);

        return new TicketDto
        {
            Id = ticket.Id, Number = ticket.Number, ProjectId = ticket.ProjectId,
            SubmittedById = ticket.SubmittedById,
            SubmittedByName = names.GetValueOrDefault(ticket.SubmittedById, "Unknown"),
            Subject = ticket.Subject, Description = ticket.Description,
            Type = ticket.Type, Priority = ticket.Priority, Status = ticket.Status,
            AssignedToId = ticket.AssignedToId,
            AssignedToName = ticket.AssignedToId is not null ? names.GetValueOrDefault(ticket.AssignedToId) : null,
            ConvertedToTaskId = ticket.ConvertedToTaskId,
            CreatedAt = ticket.CreatedAt, UpdatedAt = ticket.UpdatedAt,
            SlaStatus = slaStatus,
            ResponseDeadlineUtc = responseDeadline,
            ResolutionDeadlineUtc = resolutionDeadline,
            SlaHoursRemaining = hoursRemaining,
        };
    }
}
