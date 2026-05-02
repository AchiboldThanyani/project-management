using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Ai.Ask;
using ProjectManagement.Application.Features.Ai.Plan;
using ProjectManagement.Application.Features.Ai.Plan.Conversation;
using ProjectManagement.Application.Features.Ai.Vault;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Roles = "ProjectManager,Admin")]
public class AiController(IMediator mediator) : ControllerBase
{
    [HttpPost("ask")]
    public async Task<ActionResult<AiResponse>> Ask([FromBody] AiAskBody body, CancellationToken ct)
        => (await mediator.Send(new AskAiQuery(body.Question, body.ProjectId, body.History, body.DeepThinking), ct)).ToActionResult(this);

    [HttpPost("vault")]
    public async Task<ActionResult<string>> VaultAi([FromBody] VaultAiBody body, CancellationToken ct)
        => (await mediator.Send(new VaultAiQuery(body.Mode, body.Instruction, body.Content, body.ProjectId), ct)).ToActionResult(this);

    [HttpPost("plan/conversation")]
    public async Task<ActionResult<PlanConversationResponse>> PlanConversation(
        [FromBody] PlanConversationBody body, CancellationToken ct)
        => (await mediator.Send(
            new PlanConversationQuery(body.History, body.NewMessage, body.Phase), ct))
            .ToActionResult(this);
}

public record AiAskBody(string Question, Guid? ProjectId = null, IReadOnlyList<ChatMessage>? History = null, bool DeepThinking = false);
public record VaultAiBody(string Mode, string Instruction, string? Content = null, Guid? ProjectId = null);

public record PlanConversationBody(
    IReadOnlyList<PlanConversationMessage> History,
    string NewMessage,
    PlanConversationPhase Phase);
