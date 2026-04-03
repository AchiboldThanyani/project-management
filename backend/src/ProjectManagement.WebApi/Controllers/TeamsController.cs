using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Teams.AddTeamMember;
using ProjectManagement.Application.Features.Teams.CreateTeam;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Application.Features.Teams.GetTeamById;
using ProjectManagement.Application.Features.Teams.GetTeamsByUser;
using ProjectManagement.Application.Features.Teams.RemoveTeamMember;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TeamDto>>> GetMyTeams(CancellationToken ct)
        => (await mediator.Send(new GetTeamsByUserQuery(CurrentUserId), ct)).ToActionResult(this);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TeamDto>> GetById(Guid id, CancellationToken ct)
        => (await mediator.Send(new GetTeamByIdQuery(id), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<TeamDto>> Create([FromBody] CreateTeamRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTeamCommand(request.Name, request.Description, CurrentUserId), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<TeamDto>> AddMember(Guid id, [FromBody] AddMemberRequest request, CancellationToken ct)
        => (await mediator.Send(new AddTeamMemberCommand(id, request.UserId, request.Role), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}/members/{userId}")]
    public async Task<ActionResult<TeamDto>> RemoveMember(Guid id, string userId, CancellationToken ct)
        => (await mediator.Send(new RemoveTeamMemberCommand(id, userId), ct)).ToActionResult(this);
}

public record CreateTeamRequest(string Name, string? Description);
public record AddMemberRequest(string UserId, TeamRole Role);
