using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.SubTasks.DeleteSubTask;

internal sealed class DeleteSubTaskCommandHandler(ISubTaskRepository repo)
    : IRequestHandler<DeleteSubTaskCommand, Result>
{
    public async Task<Result> Handle(DeleteSubTaskCommand request, CancellationToken ct)
    {
        var subTask = await repo.GetByIdAsync(request.SubTaskId, ct);
        if (subTask is null) return Error.NotFound("SubTask.NotFound", "Sub-task not found");

        repo.Remove(subTask);
        await repo.SaveAsync(ct);
        return Result.Success();
    }
}
