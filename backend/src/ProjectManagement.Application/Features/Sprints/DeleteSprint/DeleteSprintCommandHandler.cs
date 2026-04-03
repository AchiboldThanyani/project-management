using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.DeleteSprint;

internal sealed class DeleteSprintCommandHandler(ISprintRepository repository, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteSprintCommand, Result>
{
    public async Task<Result> Handle(DeleteSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (sprint is null)
            return SprintErrors.NotFound(request.Id);

        await repository.DeleteAsync(sprint, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
