using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Teams.AddTeamMember;

public sealed record AddTeamMemberCommand(Guid TeamId, string UserId, TeamRole Role) : ICommand<TeamDto>;
