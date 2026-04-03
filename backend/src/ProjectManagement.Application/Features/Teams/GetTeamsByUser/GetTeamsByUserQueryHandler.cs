using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Teams.GetTeamsByUser;

internal sealed class GetTeamsByUserQueryHandler(
    ITeamMemberRepository memberRepository,
    ITeamRepository teamRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetTeamsByUserQuery, Result<IReadOnlyList<TeamDto>>>
{
    public async Task<Result<IReadOnlyList<TeamDto>>> Handle(GetTeamsByUserQuery request, CancellationToken cancellationToken)
    {
        var memberships = await memberRepository.FindAsync(m => m.UserId == request.UserId, cancellationToken);
        var teamIds = memberships.Select(m => m.TeamId).ToHashSet();

        if (teamIds.Count == 0)
            return Result<IReadOnlyList<TeamDto>>.Success([]);

        var teams = await teamRepository.FindAsync(t => teamIds.Contains(t.Id), cancellationToken);
        var allMembers = await memberRepository.FindAsync(m => teamIds.Contains(m.TeamId), cancellationToken);

        return Result<IReadOnlyList<TeamDto>>.Success(
            await TeamDtoBuilder.BuildManyAsync(teams, allMembers, userRepository, cancellationToken));
    }
}
