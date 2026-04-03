using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Labels.RemoveLabelFromTask;

internal sealed class RemoveLabelFromTaskCommandHandler(
    ITaskRepository taskRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<RemoveLabelFromTaskCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(RemoveLabelFromTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await taskRepository.GetByIdWithLabelsAsync(request.TaskId, cancellationToken);
        if (task is null) return Error.NotFound("Task.NotFound", "Task not found.");

        var label = task.Labels.FirstOrDefault(l => l.Id == request.LabelId);
        if (label is not null)
            task.Labels.Remove(label);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
