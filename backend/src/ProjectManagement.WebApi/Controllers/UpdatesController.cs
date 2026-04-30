using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Updates.GetProjectUpdatesFeed;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[Authorize]
[ApiController]
[Route("api/projects/{projectId:guid}/updates")]
public class UpdatesController(IMediator mediator) : ControllerBase
{
    [HttpGet("feed")]
    public async Task<ActionResult<IReadOnlyList<UpdatesFeedDayDto>>> GetFeed(
        [FromRoute] Guid projectId,
        [FromQuery] int days = 14,
        CancellationToken ct = default)
        => (await mediator.Send(new GetProjectUpdatesFeedQuery(projectId, days), ct)).ToActionResult(this);
}
