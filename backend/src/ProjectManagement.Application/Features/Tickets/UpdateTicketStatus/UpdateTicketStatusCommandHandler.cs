using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.UpdateTicketStatus;

internal sealed class UpdateTicketStatusCommandHandler(
    ITicketRepository  tickets,
    IUserRepository    users,
    IUnitOfWork        unitOfWork)
    : IRequestHandler<UpdateTicketStatusCommand, Result<TicketDto>>
{
    public async Task<Result<TicketDto>> Handle(UpdateTicketStatusCommand req, CancellationToken ct)
    {
        var ticket = await tickets.GetByIdAsync(req.TicketId, ct);
        if (ticket is null)
            return Error.NotFound("Ticket.NotFound", "Ticket not found.");

        ticket.UpdateStatus(req.Status, req.AssignedToId);
        await unitOfWork.SaveChangesAsync(ct);

        var userIds = new[] { ticket.SubmittedById, ticket.AssignedToId }
            .Where(id => id is not null).Distinct().Cast<string>().ToList();
        var names = await users.GetNamesByIdsAsync(userIds, ct);

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
        };
    }
}
