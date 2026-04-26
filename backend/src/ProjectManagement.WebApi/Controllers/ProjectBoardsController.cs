using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;
using ProjectManagement.Application.Features.ProjectBoards.DeleteProjectBoard;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Features.ProjectBoards.GetProjectBoard;
using ProjectManagement.Application.Features.ProjectBoards.GetProjectBoards;
using ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/boards")]
[Authorize]
public class ProjectBoardsController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectBoardDto>>> GetBoards(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetProjectBoardsQuery(projectId), ct)).ToActionResult(this);

    [HttpGet("{boardId:guid}")]
    public async Task<ActionResult<ProjectBoardDetailDto>> GetBoard(Guid projectId, Guid boardId, CancellationToken ct)
        => (await mediator.Send(new GetProjectBoardQuery(boardId), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<ProjectBoardDto>> CreateBoard(
        Guid projectId, [FromBody] CreateProjectBoardRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateProjectBoardCommand(request.Title, projectId, CurrentUserId), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetBoard), new { projectId, boardId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{boardId:guid}")]
    public async Task<ActionResult<ProjectBoardDetailDto>> UpdateBoard(
        Guid projectId, Guid boardId, [FromBody] UpdateProjectBoardRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateProjectBoardCommand(boardId, request.Title, request.ContentJson, CurrentUserId), ct)).ToActionResult(this);

    [HttpDelete("{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid projectId, Guid boardId, CancellationToken ct)
        => (await mediator.Send(new DeleteProjectBoardCommand(boardId, CurrentUserId), ct)).ToActionResult(this);
}

public sealed record CreateProjectBoardRequest(string Title);
public sealed record UpdateProjectBoardRequest(string? Title, string? ContentJson);
