using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.PersonalTokens.Commands.CreateToken;
using ProjectManagement.Application.Features.PersonalTokens.Commands.RevokeToken;
using ProjectManagement.Application.Features.PersonalTokens.DTOs;
using ProjectManagement.Application.Features.PersonalTokens.Queries.GetTokens;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/tokens")]
[Authorize]
public class PersonalAccessTokensController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PersonalAccessTokenDto>>> GetAll(CancellationToken ct)
        => (await mediator.Send(new GetPersonalAccessTokensQuery(), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<CreatedTokenDto>> Create(
        [FromBody] CreateTokenRequest body, CancellationToken ct)
        => (await mediator.Send(new CreatePersonalAccessTokenCommand(body.Label), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new RevokePersonalAccessTokenCommand(id), ct);
        return result.IsSuccess ? NoContent() : NotFound();
    }
}

public record CreateTokenRequest(string Label);
