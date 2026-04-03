using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Labels.AddLabelToTask;

internal sealed class AddLabelToTaskCommandHandler(
    ITaskRepository taskRepository,
    ILabelRepository labelRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddLabelToTaskCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(AddLabelToTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await taskRepository.GetByIdWithLabelsAsync(request.TaskId, cancellationToken);
        if (task is null) return Error.NotFound("Task.NotFound", "Task not found.");

        var label = await labelRepository.GetByIdAsync(request.LabelId, cancellationToken);
        if (label is null) return Error.NotFound("Label.NotFound", "Label not found.");

        if (!task.Labels.Any(l => l.Id == label.Id))
            task.Labels.Add(label);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
