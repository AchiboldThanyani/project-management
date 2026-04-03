using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;

namespace ProjectManagement.Application.Features.Teams.RemoveTeamMember;

public sealed record RemoveTeamMemberCommand(Guid TeamId, string UserId) : ICommand<TeamDto>;
