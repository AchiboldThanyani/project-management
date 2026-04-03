using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Comments.CreateComment;
using ProjectManagement.Application.Features.Comments.DeleteComment;
using ProjectManagement.Application.Features.Comments.DTOs;
using ProjectManagement.Application.Features.Comments.GetCommentsByTask;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/tasks/{taskId:guid}/comments")]
[Authorize]
public class CommentsController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetByTask(Guid taskId, CancellationToken ct)
        => (await mediator.Send(new GetCommentsByTaskQuery(taskId), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<CommentDto>> Create(Guid taskId, [FromBody] CreateCommentRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateCommentCommand(taskId, request.Content, CurrentUserId), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return Created(string.Empty, result.Value);
    }

    [HttpDelete("{commentId:guid}")]
    public async Task<IActionResult> Delete(Guid taskId, Guid commentId, CancellationToken ct)
        => (await mediator.Send(new DeleteCommentCommand(commentId, CurrentUserId), ct)).ToActionResult(this);
}

public record CreateCommentRequest(string Content);
