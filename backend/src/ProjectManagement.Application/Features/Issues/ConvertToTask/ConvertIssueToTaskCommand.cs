using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Issues.ConvertToTask;

public sealed record ConvertIssueToTaskCommand(
    Guid IssueId,
    Guid? SprintId,
    TaskPriority? Priority) : ICommand<TaskDto>;
