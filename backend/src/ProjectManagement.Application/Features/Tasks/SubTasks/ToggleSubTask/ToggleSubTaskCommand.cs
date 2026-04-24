using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.ToggleSubTask;

public record ToggleSubTaskCommand(Guid SubTaskId) : IRequest<Result<SubTaskDto>>;
