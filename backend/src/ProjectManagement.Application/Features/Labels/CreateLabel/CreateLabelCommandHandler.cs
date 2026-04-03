using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Labels.CreateLabel;

internal sealed class CreateLabelCommandHandler(
    ILabelRepository labelRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<CreateLabelCommand, Result<LabelDto>>
{
    public async Task<Result<LabelDto>> Handle(CreateLabelCommand request, CancellationToken cancellationToken)
    {
        var label = Label.Create(request.Name, request.Color, request.ProjectId);
        await labelRepository.AddAsync(label, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return new LabelDto { Id = label.Id, Name = label.Name, Color = label.Color, ProjectId = label.ProjectId };
    }
}
