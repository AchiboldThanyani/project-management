using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.GetTicketsByProject;

internal sealed class GetTicketsByProjectQueryHandler(
    ITicketRepository  tickets,
    IUserRepository    users)
    : IRequestHandler<GetTicketsByProjectQuery, Result<IReadOnlyList<TicketDto>>>
{
    public async Task<Result<IReadOnlyList<TicketDto>>> Handle(GetTicketsByProjectQuery req, CancellationToken ct)
    {
        var list = await tickets.GetByProjectAsync(req.ProjectId, req.Status, ct);

        var userIds = list.SelectMany(t => new[] { t.SubmittedById, t.AssignedToId })
                         .Where(id => id is not null).Distinct().Cast<string>().ToList();
        var names = await users.GetNamesByIdsAsync(userIds, ct);

        return list.Select(t => MapDto(t, names)).ToList();
    }

    private static TicketDto MapDto(Domain.Entities.Ticket t, Dictionary<string, string> names) => new()
    {
        Id = t.Id, Number = t.Number, ProjectId = t.ProjectId,
        SubmittedById = t.SubmittedById,
        SubmittedByName = names.GetValueOrDefault(t.SubmittedById, "Unknown"),
        Subject = t.Subject, Description = t.Description,
        Type = t.Type, Priority = t.Priority, Status = t.Status,
        AssignedToId = t.AssignedToId,
        AssignedToName = t.AssignedToId is not null ? names.GetValueOrDefault(t.AssignedToId, "") : null,
        ConvertedToTaskId = t.ConvertedToTaskId,
        CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt,
    };
}
