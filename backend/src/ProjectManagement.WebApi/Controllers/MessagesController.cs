using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Messages.DTOs;
using ProjectManagement.Application.Features.Messages.GetTeamMessages;
using ProjectManagement.Application.Features.Messages.SendMessage;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/teams/{teamId:guid}/messages")]
[Authorize]
public class MessagesController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MessageDto>>> GetMessages(Guid teamId, CancellationToken ct)
        => (await mediator.Send(new GetTeamMessagesQuery(teamId), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<MessageDto>> Send(Guid teamId, [FromBody] SendMessageRequest request, CancellationToken ct)
        => (await mediator.Send(new SendMessageCommand(teamId, CurrentUserId, request.Content), ct)).ToActionResult(this);
}

public record SendMessageRequest(string Content);
