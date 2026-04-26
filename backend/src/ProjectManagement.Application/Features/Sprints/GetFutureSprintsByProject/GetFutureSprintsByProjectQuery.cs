using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.GetFutureSprintsByProject;

public sealed record GetFutureSprintsByProjectQuery(Guid ProjectId)
    : IQuery<IReadOnlyList<SprintDto>>;
