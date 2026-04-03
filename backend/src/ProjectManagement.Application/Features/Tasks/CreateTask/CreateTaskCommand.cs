using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tasks.CreateTask;

public sealed record CreateTaskCommand(
    string Title,
    string? Description,
    TaskPriority Priority,
    DateTime? DueDate,
    int? StoryPoints,
    Guid ProjectId,
    Guid? SprintId,
    string? AssigneeId,
    string ReporterId) : ICommand<TaskDto>;
