using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.CreateSubTask;

internal sealed class CreateSubTaskCommandHandler(ISubTaskRepository repo, ITaskRepository taskRepo)
    : IRequestHandler<CreateSubTaskCommand, Result<SubTaskDto>>
{
    public async Task<Result<SubTaskDto>> Handle(CreateSubTaskCommand request, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(request.TaskId, ct);
        if (task is null) return Error.NotFound("Task.NotFound", "Task not found");

        var existing = await repo.GetByTaskIdAsync(request.TaskId, ct);
        var subTask = SubTask.Create(request.TaskId, request.Title, existing.Count);

        await repo.AddAsync(subTask, ct);
        await repo.SaveAsync(ct);

        return new SubTaskDto { Id = subTask.Id, TaskId = subTask.TaskId, Title = subTask.Title, IsCompleted = subTask.IsCompleted, Order = subTask.Order, CreatedAt = subTask.CreatedAt };
    }
}
