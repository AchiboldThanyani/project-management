using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Ai.Plan;

public sealed record PlanTaskItem(string Title, string Description, TaskPriority Priority);
