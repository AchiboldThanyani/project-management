using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;

namespace ProjectManagement.Application.Features.Teams.CreateTeam;

public sealed record CreateTeamCommand(string Name, string? Description, string CreatorId) : ICommand<TeamDto>;
