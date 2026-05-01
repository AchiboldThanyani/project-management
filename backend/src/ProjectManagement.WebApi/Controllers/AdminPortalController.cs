using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Tickets.GetPortalTickets;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/admin/portal")]
[Authorize(Roles = "Admin,ProjectManager")]
public class AdminPortalController(ISender sender) : ControllerBase
{
    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(CancellationToken ct)
    {
        var result = await sender.Send(new GetPortalTicketsQuery(), ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
