using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Tickets.AddTicketComment;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Features.Tickets.GetMyTickets;
using ProjectManagement.Application.Features.Tickets.GetTicketById;
using ProjectManagement.Application.Features.Tickets.GetTicketComments;
using ProjectManagement.Application.Features.Tickets.SubmitTicket;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

/// <summary>Customer-facing portal endpoints — only accessible to Customer role.</summary>
[ApiController]
[Route("api/portal")]
[Authorize(Roles = "Customer")]
public class CustomerPortalController(IMediator mediator) : ControllerBase
{
    [HttpGet("tickets")]
    public async Task<ActionResult<IReadOnlyList<TicketDto>>> GetMyTickets(
        [FromQuery] Guid? projectId, CancellationToken ct)
        => (await mediator.Send(new GetMyTicketsQuery(projectId), ct)).ToActionResult(this);

    [HttpGet("tickets/{ticketId:guid}")]
    public async Task<ActionResult<TicketDto>> GetById(Guid ticketId, CancellationToken ct)
        => (await mediator.Send(new GetTicketByIdQuery(ticketId), ct)).ToActionResult(this);

    [HttpPost("projects/{projectId:guid}/tickets")]
    public async Task<ActionResult<TicketDto>> Submit(
        Guid projectId, [FromBody] SubmitTicketBody body, CancellationToken ct)
        => (await mediator.Send(new SubmitTicketCommand(projectId, body.Subject, body.Description, body.Type, body.Priority), ct))
            .ToActionResult(this);

    [HttpGet("tickets/{ticketId:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<TicketCommentDto>>> GetComments(Guid ticketId, CancellationToken ct)
        => (await mediator.Send(new GetTicketCommentsQuery(ticketId), ct)).ToActionResult(this);

    [HttpPost("tickets/{ticketId:guid}/comments")]
    public async Task<ActionResult<TicketCommentDto>> AddComment(
        Guid ticketId, [FromBody] AddCommentBody body, CancellationToken ct)
        => (await mediator.Send(new AddTicketCommentCommand(ticketId, body.Content), ct)).ToActionResult(this);
}

public record SubmitTicketBody(string Subject, string? Description, TicketType Type, TaskPriority Priority);
