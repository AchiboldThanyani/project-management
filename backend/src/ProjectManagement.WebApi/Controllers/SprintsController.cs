using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Sprints.ActivateSprint;
using ProjectManagement.Application.Features.Sprints.CompleteSprint;
using ProjectManagement.Application.Features.Sprints.DeleteSprint;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Features.Sprints.UpdateSprint;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SprintsController(IMediator mediator) : ControllerBase
{
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SprintDto>> Update(Guid id, [FromBody] UpdateSprintRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateSprintCommand(id, request.Name, request.Goal, request.StartDate, request.EndDate), ct)).ToActionResult(this);

    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<SprintDto>> Activate(Guid id, CancellationToken ct)
        => (await mediator.Send(new ActivateSprintCommand(id), ct)).ToActionResult(this);

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<SprintDto>> Complete(Guid id, [FromBody] CompleteSprintRequest req, CancellationToken ct)
        => (await mediator.Send(new CompleteSprintCommand(id, req.RetroNotes), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await mediator.Send(new DeleteSprintCommand(id), ct)).ToActionResult(this);
}

public record UpdateSprintRequest(string Name, string? Goal, DateTime StartDate, DateTime EndDate);
public record CompleteSprintRequest(string? RetroNotes = null);
