using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.CreateSubTask;

public record CreateSubTaskCommand(Guid TaskId, string Title) : IRequest<Result<SubTaskDto>>;
