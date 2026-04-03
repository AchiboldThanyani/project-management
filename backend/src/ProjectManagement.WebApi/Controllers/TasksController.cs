using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.CreateTask;
using ProjectManagement.Application.Features.Tasks.DeleteTask;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Features.Tasks.GetTaskById;
using ProjectManagement.Application.Features.Tasks.GetTasksByProject;
using ProjectManagement.Application.Features.Tasks.UpdateTask;
using ProjectManagement.Application.Features.Tasks.UpdateTaskStatus;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Extensions;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("project/{projectId:guid}")]
    public async Task<ActionResult<PagedResult<TaskDto>>> GetByProject(
        Guid projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        => (await mediator.Send(new GetTasksByProjectQuery(projectId, page, pageSize), ct)).ToActionResult(this);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskDto>> GetById(Guid id, CancellationToken ct)
        => (await mediator.Send(new GetTaskByIdQuery(id), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create([FromBody] CreateTaskRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTaskCommand(
            request.Title, request.Description, request.Priority, request.DueDate,
            request.StoryPoints, request.ProjectId, request.SprintId, request.AssigneeId, CurrentUserId), ct);

        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TaskDto>> Update(Guid id, [FromBody] UpdateTaskRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateTaskCommand(id, request.Title, request.Description,
            request.Priority, request.DueDate, request.SprintId, request.AssigneeId, request.StoryPoints), ct)).ToActionResult(this);

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<TaskDto>> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateTaskStatusCommand(id, request.Status), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await mediator.Send(new DeleteTaskCommand(id), ct)).ToActionResult(this);
}

public record CreateTaskRequest(
    string Title, string? Description, TaskPriority Priority,
    DateTime? DueDate, int? StoryPoints, Guid ProjectId, Guid? SprintId, string? AssigneeId);

public record UpdateTaskRequest(
    string Title, string? Description, TaskPriority Priority,
    DateTime? DueDate, Guid? SprintId, string? AssigneeId, int? StoryPoints);

public record UpdateStatusRequest(TaskStatus Status);
