using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;

namespace ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;

public sealed record CreateProjectWithPlanCommand(
    string Name,
    string Description,
    IReadOnlyList<PlanTaskItem> Tasks)
    : IRequest<Result<ProjectDto>>;
