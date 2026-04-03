using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Teams.GetTeamById;

internal sealed class GetTeamByIdQueryHandler(
    ITeamRepository teamRepository,
    ITeamMemberRepository memberRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetTeamByIdQuery, Result<TeamDto>>
{
    public async Task<Result<TeamDto>> Handle(GetTeamByIdQuery request, CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByIdAsync(request.TeamId, cancellationToken);
        if (team is null)
            return TeamErrors.NotFound(request.TeamId);

        var members = await memberRepository.FindAsync(m => m.TeamId == request.TeamId, cancellationToken);
        return await TeamDtoBuilder.BuildAsync(team, members, userRepository, cancellationToken);
    }
}
