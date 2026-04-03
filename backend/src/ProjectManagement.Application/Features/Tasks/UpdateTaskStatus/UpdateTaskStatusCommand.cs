using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Tasks.UpdateTaskStatus;

public sealed record UpdateTaskStatusCommand(Guid TaskId, TaskStatus Status) : ICommand<TaskDto>;
