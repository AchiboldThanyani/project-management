using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;

namespace ProjectManagement.Application.Features.Teams.GetTeamById;

public sealed record GetTeamByIdQuery(Guid TeamId) : IQuery<TeamDto>;
