using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Labels.AddLabelToTask;
using ProjectManagement.Application.Features.Labels.CreateLabel;
using ProjectManagement.Application.Features.Labels.DeleteLabel;
using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Features.Labels.GetLabelsByProject;
using ProjectManagement.Application.Features.Labels.RemoveLabelFromTask;
using ProjectManagement.Application.Features.Labels.SeedLabels;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LabelsController(IMediator mediator) : ControllerBase
{
    // GET api/labels/project/{projectId}
    [HttpGet("project/{projectId:guid}")]
    public async Task<ActionResult<IReadOnlyList<LabelDto>>> GetByProject(Guid projectId, CancellationToken ct = default)
        => (await mediator.Send(new GetLabelsByProjectQuery(projectId), ct)).ToActionResult(this);

    // POST api/labels
    [HttpPost]
    public async Task<ActionResult<LabelDto>> Create([FromBody] CreateLabelRequest body, CancellationToken ct = default)
        => (await mediator.Send(new CreateLabelCommand(body.ProjectId, body.Name, body.Color), ct)).ToActionResult(this);

    // DELETE api/labels/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var result = await mediator.Send(new DeleteLabelCommand(id), ct);
        return result.IsSuccess ? NoContent() : UnitError(result.Error!);
    }

    // POST api/labels/{id}/tasks/{taskId}
    [HttpPost("{id:guid}/tasks/{taskId:guid}")]
    public async Task<IActionResult> AddToTask(Guid id, Guid taskId, CancellationToken ct = default)
    {
        var result = await mediator.Send(new AddLabelToTaskCommand(taskId, id), ct);
        return result.IsSuccess ? NoContent() : UnitError(result.Error!);
    }

    // DELETE api/labels/{id}/tasks/{taskId}
    [HttpDelete("{id:guid}/tasks/{taskId:guid}")]
    public async Task<IActionResult> RemoveFromTask(Guid id, Guid taskId, CancellationToken ct = default)
    {
        var result = await mediator.Send(new RemoveLabelFromTaskCommand(taskId, id), ct);
        return result.IsSuccess ? NoContent() : UnitError(result.Error!);
    }

    // POST api/labels/project/{projectId}/seed  — idempotent, seeds default labels if none exist
    [HttpPost("project/{projectId:guid}/seed")]
    public async Task<IActionResult> Seed(Guid projectId, CancellationToken ct = default)
    {
        var result = await mediator.Send(new SeedLabelsCommand(projectId), ct);
        return result.IsSuccess ? NoContent() : UnitError(result.Error!);
    }

    private IActionResult UnitError(Error error) => error.Type switch
    {
        ErrorType.NotFound     => NotFound(new { error.Code, error.Description }),
        ErrorType.Validation   => BadRequest(new { error.Code, error.Description }),
        ErrorType.Conflict     => Conflict(new { error.Code, error.Description }),
        ErrorType.Unauthorized => Forbid(),
        _                      => StatusCode(500, new { error.Code, error.Description }),
    };
}

public record CreateLabelRequest(Guid ProjectId, string Name, string Color);
