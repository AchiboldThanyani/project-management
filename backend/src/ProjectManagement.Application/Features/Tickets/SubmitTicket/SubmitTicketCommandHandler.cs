using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.SubmitTicket;

internal sealed class SubmitTicketCommandHandler(
    ITicketRepository      tickets,
    ICustomerProjectAccessRepository access,
    ICurrentUserService    currentUser,
    IUnitOfWork            unitOfWork)
    : IRequestHandler<SubmitTicketCommand, Result<TicketDto>>
{
    public async Task<Result<TicketDto>> Handle(SubmitTicketCommand req, CancellationToken ct)
    {
        var hasAccess = await access.HasAccessAsync(currentUser.UserId, req.ProjectId, ct);
        if (!hasAccess)
            return Error.Unauthorized("Ticket.NoAccess", "You do not have access to this project.");

        var nextNumber = await tickets.NextNumberAsync(req.ProjectId, ct);

        var ticket = Ticket.Create(nextNumber, req.ProjectId, currentUser.UserId,
            req.Subject, req.Description, req.Type, req.Priority);

        await tickets.AddAsync(ticket, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return ToDto(ticket, currentUser.FullName, null);
    }

    private static TicketDto ToDto(Ticket t, string submitterName, string? assigneeName) => new()
    {
        Id = t.Id, Number = t.Number, ProjectId = t.ProjectId,
        SubmittedById = t.SubmittedById, SubmittedByName = submitterName,
        Subject = t.Subject, Description = t.Description,
        Type = t.Type, Priority = t.Priority, Status = t.Status,
        AssignedToId = t.AssignedToId, AssignedToName = assigneeName,
        ConvertedToTaskId = t.ConvertedToTaskId,
        CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt,
    };
}
