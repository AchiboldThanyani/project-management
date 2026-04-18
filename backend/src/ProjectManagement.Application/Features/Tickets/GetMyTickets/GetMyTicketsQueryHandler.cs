using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.GetMyTickets;

internal sealed class GetMyTicketsQueryHandler(
    ITicketRepository  tickets,
    ICurrentUserService currentUser)
    : IRequestHandler<GetMyTicketsQuery, Result<IReadOnlyList<TicketDto>>>
{
    public async Task<Result<IReadOnlyList<TicketDto>>> Handle(GetMyTicketsQuery req, CancellationToken ct)
    {
        var list = await tickets.GetBySubmitterAsync(currentUser.UserId, req.ProjectId, ct);

        return list.Select(t => new TicketDto
        {
            Id = t.Id, Number = t.Number, ProjectId = t.ProjectId,
            SubmittedById = t.SubmittedById, SubmittedByName = currentUser.FullName,
            Subject = t.Subject, Description = t.Description,
            Type = t.Type, Priority = t.Priority, Status = t.Status,
            AssignedToId = t.AssignedToId,
            ConvertedToTaskId = t.ConvertedToTaskId,
            CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt,
        }).ToList();
    }
}
