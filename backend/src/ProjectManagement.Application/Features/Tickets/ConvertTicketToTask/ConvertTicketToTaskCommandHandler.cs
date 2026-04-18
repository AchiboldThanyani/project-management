using MediatR;
using AutoMapper;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.ConvertTicketToTask;

internal sealed class ConvertTicketToTaskCommandHandler(
    ITicketRepository  tickets,
    ITaskRepository    tasks,
    ICurrentUserService currentUser,
    IUnitOfWork        unitOfWork,
    IMapper            mapper)
    : IRequestHandler<ConvertTicketToTaskCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(ConvertTicketToTaskCommand req, CancellationToken ct)
    {
        var ticket = await tickets.GetByIdAsync(req.TicketId, ct);
        if (ticket is null)
            return Error.NotFound("Ticket.NotFound", "Ticket not found.");

        if (ticket.ConvertedToTaskId.HasValue)
            return Error.Conflict("Ticket.AlreadyConverted", "Ticket has already been converted to a task.");

        var task = ProjectTask.Create(
            req.Title        ?? ticket.Subject,
            ticket.ProjectId,
            currentUser.UserId,
            req.Description  ?? ticket.Description,
            req.Priority     ?? ticket.Priority,
            dueDate: null,
            req.SprintId,
            req.AssigneeId);

        await tasks.AddAsync(task, ct);

        ticket.MarkConverted(task.Id);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<TaskDto>(task);
    }
}
