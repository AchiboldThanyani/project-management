using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.GetFutureSprintsByProject;

internal sealed class GetFutureSprintsByProjectQueryHandler(ISprintRepository repository, IMapper mapper)
    : IRequestHandler<GetFutureSprintsByProjectQuery, Result<IReadOnlyList<SprintDto>>>
{
    public async Task<Result<IReadOnlyList<SprintDto>>> Handle(
        GetFutureSprintsByProjectQuery request, CancellationToken cancellationToken)
    {
        var sprints = await repository.GetFutureSprintsForProjectAsync(request.ProjectId, cancellationToken);
        return Result<IReadOnlyList<SprintDto>>.Success(mapper.Map<IReadOnlyList<SprintDto>>(sprints));
    }
}
