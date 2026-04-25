using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Ai.Ask;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Roles = "Internal")]
public class AiController(IMediator mediator) : ControllerBase
{
    [HttpPost("ask")]
    public async Task<ActionResult<AiResponse>> Ask([FromBody] AiAskBody body, CancellationToken ct)
        => (await mediator.Send(new AskAiQuery(body.Question, body.ProjectId, body.History), ct)).ToActionResult(this);
}

public record AiAskBody(string Question, Guid? ProjectId = null, IReadOnlyList<ChatMessage>? History = null);
