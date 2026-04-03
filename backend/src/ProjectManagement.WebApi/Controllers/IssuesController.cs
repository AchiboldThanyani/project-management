using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.AddIssueComment;
using ProjectManagement.Application.Features.Issues.CloseIssue;
using ProjectManagement.Application.Features.Issues.ConvertToTask;
using ProjectManagement.Application.Features.Issues.CreateIssue;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Features.Issues.GetIssueById;
using ProjectManagement.Application.Features.Issues.GetIssueComments;
using ProjectManagement.Application.Features.Issues.GetIssuesByProject;
using ProjectManagement.Application.Features.Issues.ReopenIssue;
using ProjectManagement.Application.Features.Issues.UpdateIssue;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IssuesController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET api/issues/project/{projectId}?status=0&type=0&page=1&pageSize=50
    [HttpGet("project/{projectId:guid}")]
    public async Task<ActionResult<PagedResult<IssueDto>>> GetByProject(
        Guid projectId,
        [FromQuery] IssueStatus? status,
        [FromQuery] IssueType? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
        => (await mediator.Send(new GetIssuesByProjectQuery(projectId, status, type, page, pageSize), ct)).ToActionResult(this);

    // GET api/issues/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IssueDto>> GetById(Guid id, CancellationToken ct)
        => (await mediator.Send(new GetIssueByIdQuery(id), ct)).ToActionResult(this);

    // GET api/issues/{id}/comments
    [HttpGet("{id:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<IssueCommentDto>>> GetComments(Guid id, CancellationToken ct)
        => (await mediator.Send(new GetIssueCommentsQuery(id), ct)).ToActionResult(this);

    // POST api/issues
    [HttpPost]
    public async Task<ActionResult<IssueDto>> Create([FromBody] CreateIssueRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateIssueCommand(
            request.Title, request.Description, request.Type,
            request.Priority, request.ProjectId, request.AssigneeId, CurrentUserId), ct);

        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    // PUT api/issues/{id}
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<IssueDto>> Update(Guid id, [FromBody] UpdateIssueRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateIssueCommand(
            id, request.Title, request.Description, request.Type, request.Priority, request.AssigneeId), ct)).ToActionResult(this);

    // PATCH api/issues/{id}/close
    [HttpPatch("{id:guid}/close")]
    public async Task<ActionResult<IssueDto>> Close(Guid id, CancellationToken ct)
        => (await mediator.Send(new CloseIssueCommand(id), ct)).ToActionResult(this);

    // PATCH api/issues/{id}/reopen
    [HttpPatch("{id:guid}/reopen")]
    public async Task<ActionResult<IssueDto>> Reopen(Guid id, CancellationToken ct)
        => (await mediator.Send(new ReopenIssueCommand(id), ct)).ToActionResult(this);

    // POST api/issues/{id}/convert
    [HttpPost("{id:guid}/convert")]
    public async Task<ActionResult<TaskDto>> ConvertToTask(Guid id, [FromBody] ConvertIssueRequest request, CancellationToken ct)
        => (await mediator.Send(new ConvertIssueToTaskCommand(id, request.SprintId, request.Priority), ct)).ToActionResult(this);

    // POST api/issues/{id}/comments
    [HttpPost("{id:guid}/comments")]
    public async Task<ActionResult<IssueCommentDto>> AddComment(Guid id, [FromBody] AddCommentRequest request, CancellationToken ct)
        => (await mediator.Send(new AddIssueCommentCommand(id, request.Content, CurrentUserId), ct)).ToActionResult(this);
}

public record CreateIssueRequest(
    string Title, string? Description, IssueType Type,
    TaskPriority Priority, Guid ProjectId, string? AssigneeId);

public record UpdateIssueRequest(
    string Title, string? Description, IssueType Type,
    TaskPriority Priority, string? AssigneeId);

public record ConvertIssueRequest(Guid? SprintId, TaskPriority? Priority);

public record AddCommentRequest(string Content);
