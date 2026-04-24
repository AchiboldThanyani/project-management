using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.ToggleSubTask;

internal sealed class ToggleSubTaskCommandHandler(ISubTaskRepository repo)
    : IRequestHandler<ToggleSubTaskCommand, Result<SubTaskDto>>
{
    public async Task<Result<SubTaskDto>> Handle(ToggleSubTaskCommand request, CancellationToken ct)
    {
        var subTask = await repo.GetByIdAsync(request.SubTaskId, ct);
        if (subTask is null) return Error.NotFound("SubTask.NotFound", "Sub-task not found");

        subTask.Toggle();
        await repo.SaveAsync(ct);

        return new SubTaskDto { Id = subTask.Id, TaskId = subTask.TaskId, Title = subTask.Title, IsCompleted = subTask.IsCompleted, Order = subTask.Order, CreatedAt = subTask.CreatedAt };
    }
}
