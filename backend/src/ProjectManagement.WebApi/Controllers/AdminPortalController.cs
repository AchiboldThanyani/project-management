using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Tickets.GetPortalTickets;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Authorization;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/admin/portal")]
[AuthorizeRoles(UserRole.Admin, UserRole.ProjectManager)]
public class AdminPortalController(ISender sender) : ControllerBase
{
    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(CancellationToken ct)
    {
        var result = await sender.Send(new GetPortalTicketsQuery(), ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
