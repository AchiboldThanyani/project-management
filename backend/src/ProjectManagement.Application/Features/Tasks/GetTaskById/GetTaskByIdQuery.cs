using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;

namespace ProjectManagement.Application.Features.Tasks.GetTaskById;

public sealed record GetTaskByIdQuery(Guid TaskId) : IQuery<TaskDto>;
