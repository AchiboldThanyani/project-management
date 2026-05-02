using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Calendar.DTOs;
using ProjectManagement.Application.Features.Calendar.GetCalendarEvents;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CalendarController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CalendarEventDto>>> GetEvents(
        [FromQuery] DateTime start,
        [FromQuery] DateTime end,
        CancellationToken ct)
        => (await mediator.Send(new GetCalendarEventsQuery(start, end), ct)).ToActionResult(this);
}
