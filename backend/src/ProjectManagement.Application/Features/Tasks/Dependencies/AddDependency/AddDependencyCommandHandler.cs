using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.Dependencies.AddDependency;

internal sealed class AddDependencyCommandHandler(
    ITaskDependencyRepository repo,
    ITaskRepository taskRepo,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddDependencyCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(AddDependencyCommand request, CancellationToken cancellationToken)
    {
        if (request.BlockingTaskId == request.BlockedTaskId)
            return Error.Validation("Dependency.SelfReference", "A task cannot depend on itself.");

        var blocking = await taskRepo.GetByIdAsync(request.BlockingTaskId, cancellationToken);
        if (blocking is null)
            return Error.NotFound("Task.NotFound", "Blocking task not found.");

        var blocked = await taskRepo.GetByIdAsync(request.BlockedTaskId, cancellationToken);
        if (blocked is null)
            return Error.NotFound("Task.NotFound", "Blocked task not found.");

        // Prevent duplicate
        var exists = await repo.ExistsAsync(
            d => d.BlockingTaskId == request.BlockingTaskId && d.BlockedTaskId == request.BlockedTaskId,
            cancellationToken);
        if (exists)
            return Error.Conflict("Dependency.Exists", "This dependency already exists.");

        // Prevent circular: would this create A→B when B→A already exists (direct cycle)?
        var circular = await repo.ExistsAsync(
            d => d.BlockingTaskId == request.BlockedTaskId && d.BlockedTaskId == request.BlockingTaskId,
            cancellationToken);
        if (circular)
            return Error.Conflict("Dependency.Circular", "Adding this dependency would create a circular reference.");

        await repo.AddAsync(TaskDependency.Create(request.BlockingTaskId, request.BlockedTaskId), cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
