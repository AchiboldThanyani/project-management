using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.GetSprintsByProject;

internal sealed class GetSprintsByProjectQueryHandler(ISprintRepository repository, IMapper mapper)
    : IRequestHandler<GetSprintsByProjectQuery, Result<IReadOnlyList<SprintDto>>>
{
    public async Task<Result<IReadOnlyList<SprintDto>>> Handle(GetSprintsByProjectQuery request, CancellationToken cancellationToken)
    {
        var sprints = await repository.FindAsync(s => s.ProjectId == request.ProjectId, cancellationToken);
        return Result<IReadOnlyList<SprintDto>>.Success(mapper.Map<IReadOnlyList<SprintDto>>(sprints));
    }
}
