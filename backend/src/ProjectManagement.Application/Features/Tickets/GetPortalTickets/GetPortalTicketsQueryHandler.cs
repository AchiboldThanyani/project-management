using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Features.Tickets.Sla;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.GetPortalTickets;

internal sealed class GetPortalTicketsQueryHandler(
    ITicketRepository tickets,
    IUserRepository users)
    : IRequestHandler<GetPortalTicketsQuery, Result<IReadOnlyList<TicketDto>>>
{
    public async Task<Result<IReadOnlyList<TicketDto>>> Handle(
        GetPortalTicketsQuery request, CancellationToken ct)
    {
        var all = await tickets.GetAllWithProjectAsync(ct);

        var userIds = all.SelectMany(t => new[] { t.SubmittedById }
            .Concat(t.AssignedToId is not null ? [t.AssignedToId] : []))
            .Distinct();
        var names = await users.GetNamesByIdsAsync(userIds, ct);

        var dtos = all.Select(t =>
        {
            var (slaStatus, responseDeadline, resolutionDeadline, hoursRemaining) =
                SlaPolicy.Compute(t.Priority, t.CreatedAt);
            return new TicketDto
            {
                Id                   = t.Id,
                Number               = t.Number,
                ProjectId            = t.ProjectId,
                ProjectName          = t.Project?.Name,
                SubmittedById        = t.SubmittedById,
                SubmittedByName      = names.GetValueOrDefault(t.SubmittedById, "Unknown"),
                Subject              = t.Subject,
                Description          = t.Description,
                Type                 = t.Type,
                Priority             = t.Priority,
                Status               = t.Status,
                AssignedToId         = t.AssignedToId,
                AssignedToName       = t.AssignedToId is not null ? names.GetValueOrDefault(t.AssignedToId, "") : null,
                ConvertedToTaskId    = t.ConvertedToTaskId,
                CreatedAt            = t.CreatedAt,
                UpdatedAt            = t.UpdatedAt,
                SlaStatus            = slaStatus,
                ResponseDeadlineUtc  = responseDeadline,
                ResolutionDeadlineUtc = resolutionDeadline,
                SlaHoursRemaining    = hoursRemaining,
            };
        }).ToList();

        return Result.Success<IReadOnlyList<TicketDto>>(dtos);
    }
}
