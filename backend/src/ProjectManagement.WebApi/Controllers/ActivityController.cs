using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Activity.DTOs;
using ProjectManagement.Application.Features.Activity.GetActivity;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ActivityController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActivityDto>>> GetRecent(
        [FromQuery] int count = 50,
        CancellationToken ct = default)
        => (await mediator.Send(new GetActivityQuery(count), ct)).ToActionResult(this);
}
