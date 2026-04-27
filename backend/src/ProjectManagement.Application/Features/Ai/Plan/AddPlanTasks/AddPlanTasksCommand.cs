using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;

namespace ProjectManagement.Application.Features.Ai.Plan.AddPlanTasks;

public sealed record AddPlanTasksCommand(
    Guid ProjectId,
    IReadOnlyList<PlanTaskItem> Tasks)
    : ICommand<IReadOnlyList<TaskDto>>;
