using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.ProjectMessages.DTOs;
using ProjectManagement.Application.Features.ProjectMessages.GetProjectMessages;
using ProjectManagement.Application.Features.ProjectMessages.SendProjectMessage;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/messages")]
[Authorize]
public class ProjectMessagesController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectMessageDto>>> GetMessages(
        Guid projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => (await mediator.Send(new GetProjectMessagesQuery(projectId, page, pageSize), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<ProjectMessageDto>> Send(
        Guid projectId, [FromBody] SendProjectMessageRequest request, CancellationToken ct = default)
        => (await mediator.Send(new SendProjectMessageCommand(projectId, CurrentUserId, request.Content), ct)).ToActionResult(this);
}

public record SendProjectMessageRequest(string Content);
