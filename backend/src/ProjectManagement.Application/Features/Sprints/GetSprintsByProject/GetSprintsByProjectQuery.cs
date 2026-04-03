using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.GetSprintsByProject;

public sealed record GetSprintsByProjectQuery(Guid ProjectId) : IQuery<IReadOnlyList<SprintDto>>;
