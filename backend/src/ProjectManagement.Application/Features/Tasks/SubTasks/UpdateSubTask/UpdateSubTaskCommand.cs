using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.UpdateSubTask;

public record UpdateSubTaskCommand(Guid SubTaskId, decimal? EstimatedHours) : IRequest<Result<SubTaskDto>>;
