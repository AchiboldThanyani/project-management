using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Labels.SeedLabels;

internal sealed class SeedLabelsCommandHandler(
    ILabelRepository labelRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<SeedLabelsCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(SeedLabelsCommand request, CancellationToken cancellationToken)
    {
        await labelRepository.SeedDefaultLabelsAsync(request.ProjectId, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
