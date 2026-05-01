using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tasks.UpdateTask;

public sealed record UpdateTaskCommand(
    Guid Id,
    string Title,
    string? Description,
    TaskPriority Priority,
    DateTime? DueDate,
    Guid? SprintId,
    IReadOnlyList<string> AssigneeIds,
    int? StoryPoints,
    decimal? EstimatedHours = null) : ICommand<TaskDto>;
