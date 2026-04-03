using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Labels.GetLabelsByProject;

internal sealed class GetLabelsByProjectQueryHandler(ILabelRepository labelRepository)
    : IRequestHandler<GetLabelsByProjectQuery, Result<IReadOnlyList<LabelDto>>>
{
    public async Task<Result<IReadOnlyList<LabelDto>>> Handle(GetLabelsByProjectQuery request, CancellationToken cancellationToken)
    {
        var labels = await labelRepository.GetByProjectAsync(request.ProjectId, cancellationToken);
        return Result<IReadOnlyList<LabelDto>>.Success(labels);
    }
}
