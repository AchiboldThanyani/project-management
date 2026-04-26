using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.UpdateSubTask;

internal sealed class UpdateSubTaskCommandHandler(ISubTaskRepository repo)
    : IRequestHandler<UpdateSubTaskCommand, Result<SubTaskDto>>
{
    public async Task<Result<SubTaskDto>> Handle(UpdateSubTaskCommand request, CancellationToken ct)
    {
        if (request.EstimatedHours.HasValue && request.EstimatedHours.Value < 0)
            return Error.Validation("SubTask.InvalidEstimate", "EstimatedHours must be >= 0");

        var subTask = await repo.GetByIdAsync(request.SubTaskId, ct);
        if (subTask is null) return Error.NotFound("SubTask.NotFound", "Sub-task not found");

        subTask.SetEstimatedHours(request.EstimatedHours);
        await repo.SaveAsync(ct);

        return new SubTaskDto
        {
            Id = subTask.Id, TaskId = subTask.TaskId, Title = subTask.Title,
            IsCompleted = subTask.IsCompleted, Order = subTask.Order,
            EstimatedHours = subTask.EstimatedHours, CreatedAt = subTask.CreatedAt
        };
    }
}
