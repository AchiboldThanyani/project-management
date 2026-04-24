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
using ProjectManagement.Application.Features.Tasks.Dependencies.AddDependency;
using ProjectManagement.Application.Features.Tasks.Dependencies.RemoveDependency;
using ProjectManagement.Application.Features.Tasks.SubTasks;
using ProjectManagement.Application.Features.Tasks.SubTasks.CreateSubTask;
using ProjectManagement.Application.Features.Tasks.SubTasks.DeleteSubTask;
using ProjectManagement.Application.Features.Tasks.SubTasks.ToggleSubTask;
using ProjectManagement.Application.Features.Tasks.TimeLogs;
using ProjectManagement.Application.Features.Tasks.TimeLogs.DeleteTimeLog;
using ProjectManagement.Application.Features.Tasks.TimeLogs.LogTime;
using ProjectManagement.Application.Features.Tasks.UpdateTask;
using ProjectManagement.Application.Features.Tasks.UpdateTaskStatus;
using ProjectManagement.Application.Common;
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
            request.Priority, request.DueDate, request.SprintId, request.AssigneeId, request.StoryPoints, request.EstimatedHours), ct)).ToActionResult(this);

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<TaskDto>> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateTaskStatusCommand(id, request.Status), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await mediator.Send(new DeleteTaskCommand(id), ct)).ToActionResult(this);

    // ── Dependencies ──────────────────────────────────────────────────────────

    // POST api/tasks/{blockingTaskId}/blocks/{blockedTaskId}
    // "Task {blockingTaskId} blocks task {blockedTaskId}"
    [HttpPost("{blockingTaskId:guid}/blocks/{blockedTaskId:guid}")]
    public async Task<IActionResult> AddDependency(Guid blockingTaskId, Guid blockedTaskId, CancellationToken ct)
    {
        var result = await mediator.Send(new AddDependencyCommand(blockingTaskId, blockedTaskId), ct);
        return result.IsSuccess ? NoContent() : result.Error!.Type switch
        {
            ErrorType.NotFound   => NotFound(new { result.Error.Code, result.Error.Description }),
            ErrorType.Validation => BadRequest(new { result.Error.Code, result.Error.Description }),
            ErrorType.Conflict   => Conflict(new { result.Error.Code, result.Error.Description }),
            _                    => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    // DELETE api/tasks/dependencies/{dependencyId}
    [HttpDelete("dependencies/{dependencyId:guid}")]
    public async Task<IActionResult> RemoveDependency(Guid dependencyId, CancellationToken ct)
    {
        var result = await mediator.Send(new RemoveDependencyCommand(dependencyId), ct);
        return result.IsSuccess ? NoContent() : result.Error!.Type switch
        {
            ErrorType.NotFound => NotFound(new { result.Error.Code, result.Error.Description }),
            _                  => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    // ── Sub-tasks ─────────────────────────────────────────────────────────────

    [HttpPost("{taskId:guid}/subtasks")]
    public async Task<ActionResult<SubTaskDto>> CreateSubTask(Guid taskId, [FromBody] CreateSubTaskRequest req, CancellationToken ct)
        => (await mediator.Send(new CreateSubTaskCommand(taskId, req.Title), ct)).ToActionResult(this);

    [HttpPatch("subtasks/{subTaskId:guid}/toggle")]
    public async Task<ActionResult<SubTaskDto>> ToggleSubTask(Guid subTaskId, CancellationToken ct)
        => (await mediator.Send(new ToggleSubTaskCommand(subTaskId), ct)).ToActionResult(this);

    [HttpDelete("subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> DeleteSubTask(Guid subTaskId, CancellationToken ct)
        => (await mediator.Send(new DeleteSubTaskCommand(subTaskId), ct)).ToActionResult(this);

    // ── Time logs ─────────────────────────────────────────────────────────────

    [HttpPost("{taskId:guid}/timelogs")]
    public async Task<ActionResult<TimeLogDto>> LogTime(Guid taskId, [FromBody] LogTimeRequest req, CancellationToken ct)
    {
        if (!DateOnly.TryParse(req.LoggedDate, out var loggedDate))
            return BadRequest(new { Code = "InvalidDate", Description = "loggedDate must be YYYY-MM-DD" });
        return (await mediator.Send(new LogTimeCommand(taskId, req.Hours, loggedDate, req.Description), ct)).ToActionResult(this);
    }

    [HttpDelete("timelogs/{timeLogId:guid}")]
    public async Task<IActionResult> DeleteTimeLog(Guid timeLogId, CancellationToken ct)
        => (await mediator.Send(new DeleteTimeLogCommand(timeLogId), ct)).ToActionResult(this);
}

public record CreateTaskRequest(
    string Title, string? Description, TaskPriority Priority,
    DateTime? DueDate, int? StoryPoints, Guid ProjectId, Guid? SprintId, string? AssigneeId);

public record UpdateTaskRequest(
    string Title, string? Description, TaskPriority Priority,
    DateTime? DueDate, Guid? SprintId, string? AssigneeId, int? StoryPoints,
    decimal? EstimatedHours = null);

public record UpdateStatusRequest(TaskStatus Status);
public record CreateSubTaskRequest(string Title);
public record LogTimeRequest(decimal Hours, string LoggedDate, string? Description);
