using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.AddProjectMember;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Features.ProjectMembers.GetProjectMembers;
using ProjectManagement.Application.Features.ProjectMembers.RemoveProjectMember;
using ProjectManagement.Application.Features.ProjectMembers.UpdateProjectMemberRole;
using ProjectManagement.Application.Features.Projects.CreateProject;
using ProjectManagement.Application.Features.Projects.DeleteProject;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Features.Projects.GetProjectById;
using ProjectManagement.Application.Features.Projects.GetProjects;
using ProjectManagement.Application.Features.Projects.UpdateProject;
using ProjectManagement.Application.Features.Sprints.CreateSprint;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Features.Sprints.GetSprintsByProject;
using ProjectManagement.Application.Features.Ai.Plan;
using ProjectManagement.Application.Features.Ai.Plan.AddPlanTasks;
using ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Domain.Enums;
using ProjectManagement.WebApi.Authorization;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProjectDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => (await mediator.Send(new GetProjectsQuery(CurrentUserId, User.IsInRole("Admin"), page, pageSize), ct)).ToActionResult(this);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> GetById(Guid id, CancellationToken ct)
        => (await mediator.Send(new GetProjectByIdQuery(id), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] CreateProjectRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateProjectCommand(
            request.Name, request.Description, request.TeamId, request.StartDate, request.EndDate, CurrentUserId), ct);

        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, [FromBody] UpdateProjectRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateProjectCommand(id, request.Name, request.Description, request.Status, request.StartDate, request.EndDate), ct)).ToActionResult(this);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await mediator.Send(new DeleteProjectCommand(id), ct)).ToActionResult(this);

    [HttpGet("{projectId:guid}/sprints")]
    public async Task<ActionResult<IReadOnlyList<SprintDto>>> GetSprints(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetSprintsByProjectQuery(projectId), ct)).ToActionResult(this);

    [HttpPost("{projectId:guid}/sprints")]
    public async Task<ActionResult<SprintDto>> CreateSprint(Guid projectId, [FromBody] CreateSprintRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateSprintCommand(request.Name, request.Goal, request.StartDate, request.EndDate, projectId), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return Created(string.Empty, result.Value);
    }

    // ── Members ──────────────────────────────────────────────────────────────

    // GET api/projects/{projectId}/members
    [HttpGet("{projectId:guid}/members")]
    public async Task<ActionResult<IReadOnlyList<ProjectMemberDto>>> GetMembers(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetProjectMembersQuery(projectId), ct)).ToActionResult(this);

    // POST api/projects/{projectId}/members
    [HttpPost("{projectId:guid}/members")]
    public async Task<ActionResult<ProjectMemberDto>> AddMember(
        Guid projectId, [FromBody] AddProjectMemberRequest body, CancellationToken ct)
        => (await mediator.Send(new AddProjectMemberCommand(projectId, body.UserId, body.Role), ct)).ToActionResult(this);

    // PATCH api/projects/{projectId}/members/{userId}/role
    [HttpPatch("{projectId:guid}/members/{userId}/role")]
    public async Task<ActionResult<ProjectMemberDto>> UpdateMemberRole(
        Guid projectId, string userId, [FromBody] UpdateProjectMemberRoleRequest body, CancellationToken ct)
        => (await mediator.Send(new UpdateProjectMemberRoleCommand(projectId, userId, body.Role), ct)).ToActionResult(this);

    // DELETE api/projects/{projectId}/members/{userId}
    [HttpDelete("{projectId:guid}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(Guid projectId, string userId, CancellationToken ct)
    {
        var result = await mediator.Send(new RemoveProjectMemberCommand(projectId, userId), ct);
        return result.IsSuccess ? NoContent() : result.Error!.Type switch
        {
            ErrorType.NotFound => NotFound(new { result.Error.Code, result.Error.Description }),
            _ => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    [HttpPost("from-plan")]
    [AuthorizeRoles(UserRole.ProjectManager, UserRole.Admin)]
    public async Task<ActionResult<ProjectDto>> CreateFromPlan(
        [FromBody] CreateFromPlanRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(
            new CreateProjectWithPlanCommand(request.Name, request.Description, request.Tasks), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPost("{id:guid}/plan-tasks")]
    [AuthorizeRoles(UserRole.ProjectManager, UserRole.Admin)]
    public async Task<ActionResult<IReadOnlyList<TaskDto>>> AddPlanTasks(
        Guid id, [FromBody] AddPlanTasksRequest request, CancellationToken ct)
        => (await mediator.Send(new AddPlanTasksCommand(id, request.Tasks), ct)).ToActionResult(this);
}

public record CreateProjectRequest(string Name, string? Description, Guid? TeamId, DateTime? StartDate, DateTime? EndDate);
public record UpdateProjectRequest(string Name, string? Description, Domain.Enums.ProjectStatus Status, DateTime? StartDate, DateTime? EndDate);
public record CreateSprintRequest(string Name, string? Goal, DateTime StartDate, DateTime EndDate);
public record AddProjectMemberRequest(string UserId, ProjectMemberRole Role);
public record UpdateProjectMemberRoleRequest(ProjectMemberRole Role);
public record CreateFromPlanRequest(string Name, string Description, IReadOnlyList<PlanTaskItem> Tasks);
public record AddPlanTasksRequest(IReadOnlyList<PlanTaskItem> Tasks);
