using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.Dependencies.RemoveDependency;

internal sealed class RemoveDependencyCommandHandler(
    ITaskDependencyRepository repo,
    IUnitOfWork unitOfWork)
    : IRequestHandler<RemoveDependencyCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(RemoveDependencyCommand request, CancellationToken cancellationToken)
    {
        var dep = await repo.GetByIdAsync(request.DependencyId, cancellationToken);
        if (dep is null)
            return Error.NotFound("Dependency.NotFound", "Dependency not found.");

        dep.SoftDelete();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
