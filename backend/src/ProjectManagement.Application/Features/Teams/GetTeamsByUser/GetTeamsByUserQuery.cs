using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;

namespace ProjectManagement.Application.Features.Teams.GetTeamsByUser;

public sealed record GetTeamsByUserQuery(string UserId) : IQuery<IReadOnlyList<TeamDto>>;
