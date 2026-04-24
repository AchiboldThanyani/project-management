using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.DeleteSubTask;

public record DeleteSubTaskCommand(Guid SubTaskId) : IRequest<Result>;
