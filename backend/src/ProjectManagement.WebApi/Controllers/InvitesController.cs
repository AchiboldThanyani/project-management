using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Invites.DTOs;
using ProjectManagement.Application.Features.Invites.GenerateInvite;
using ProjectManagement.Application.Features.Invites.GetInviteInfo;
using ProjectManagement.Application.Features.Invites.GetInvitesByProject;
using ProjectManagement.Application.Features.Invites.RevokeInvite;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Authorization;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/invites")]
[AuthorizeRoles(UserRole.Staff, UserRole.ProjectManager, UserRole.Admin)]
public class InvitesController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<InviteDto>> Generate(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GenerateInviteCommand(projectId), ct)).ToActionResult(this);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InviteDto>>> GetByProject(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetInvitesByProjectQuery(projectId), ct)).ToActionResult(this);

    [HttpDelete("{inviteId:guid}")]
    public async Task<IActionResult> Revoke(Guid inviteId, CancellationToken ct)
    {
        var result = await mediator.Send(new RevokeInviteCommand(inviteId), ct);
        if (!result.IsSuccess)
            return result.Error!.Type == Application.Common.ErrorType.NotFound
                ? NotFound(new { result.Error.Code, result.Error.Description })
                : BadRequest(new { result.Error.Code, result.Error.Description });
        return NoContent();
    }
}

[ApiController]
[Route("api/invites")]
[AllowAnonymous]
public class InviteInfoController(IMediator mediator) : ControllerBase
{
    [HttpGet("{token}")]
    public async Task<ActionResult<InviteDto>> GetInfo(string token, CancellationToken ct)
        => (await mediator.Send(new GetInviteInfoQuery(token), ct)).ToActionResult(this);
}
