using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Labels.DeleteLabel;

internal sealed class DeleteLabelCommandHandler(
    ILabelRepository labelRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteLabelCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(DeleteLabelCommand request, CancellationToken cancellationToken)
    {
        var label = await labelRepository.GetByIdAsync(request.LabelId, cancellationToken);
        if (label is null)
            return Error.NotFound("Label.NotFound", "Label not found.");

        label.SoftDelete();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
