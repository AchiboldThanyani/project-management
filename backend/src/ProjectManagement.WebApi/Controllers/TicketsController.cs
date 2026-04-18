using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Tickets.AddTicketComment;
using ProjectManagement.Application.Features.Tickets.ConvertTicketToTask;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Features.Tickets.GetTicketById;
using ProjectManagement.Application.Features.Tickets.GetTicketComments;
using ProjectManagement.Application.Features.Tickets.GetTicketsByProject;
using ProjectManagement.Application.Features.Tickets.UpdateTicketStatus;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

/// <summary>Internal dev-side ticket endpoints.</summary>
[ApiController]
[Route("api/projects/{projectId:guid}/tickets")]
[Authorize(Roles = "Internal")]
public class TicketsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TicketDto>>> GetByProject(
        Guid projectId, [FromQuery] TicketStatus? status, CancellationToken ct)
        => (await mediator.Send(new GetTicketsByProjectQuery(projectId, status), ct)).ToActionResult(this);

    [HttpGet("{ticketId:guid}")]
    public async Task<ActionResult<TicketDto>> GetById(Guid ticketId, CancellationToken ct)
        => (await mediator.Send(new GetTicketByIdQuery(ticketId), ct)).ToActionResult(this);

    [HttpPatch("{ticketId:guid}/status")]
    public async Task<ActionResult<TicketDto>> UpdateStatus(
        Guid ticketId, [FromBody] UpdateTicketStatusBody body, CancellationToken ct)
        => (await mediator.Send(new UpdateTicketStatusCommand(ticketId, body.Status, body.AssignedToId), ct)).ToActionResult(this);

    [HttpGet("{ticketId:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<TicketCommentDto>>> GetComments(Guid ticketId, CancellationToken ct)
        => (await mediator.Send(new GetTicketCommentsQuery(ticketId), ct)).ToActionResult(this);

    [HttpPost("{ticketId:guid}/comments")]
    public async Task<ActionResult<TicketCommentDto>> AddComment(
        Guid ticketId, [FromBody] AddCommentBody body, CancellationToken ct)
        => (await mediator.Send(new AddTicketCommentCommand(ticketId, body.Content), ct)).ToActionResult(this);

    [HttpPost("{ticketId:guid}/convert")]
    public async Task<ActionResult<Application.Features.Tasks.DTOs.TaskDto>> Convert(
        Guid ticketId, [FromBody] ConvertTicketBody? body, CancellationToken ct)
        => (await mediator.Send(new ConvertTicketToTaskCommand(ticketId,
            body?.Title, body?.Description, body?.Priority, body?.SprintId, body?.AssigneeId), ct)).ToActionResult(this);
}

public record UpdateTicketStatusBody(TicketStatus Status, string? AssignedToId = null);
public record AddCommentBody(string Content);
public record ConvertTicketBody(string? Title, string? Description, TaskPriority? Priority, Guid? SprintId, string? AssigneeId);
