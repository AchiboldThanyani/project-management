using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Teams.CreateTeam;

internal sealed class CreateTeamCommandHandler(
    ITeamRepository teamRepository,
    ITeamMemberRepository memberRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<CreateTeamCommand, Result<TeamDto>>
{
    public async Task<Result<TeamDto>> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
    {
        var team = Team.Create(request.Name, request.Description);
        await teamRepository.AddAsync(team, cancellationToken);

        var ownerMember = TeamMember.Create(team.Id, request.CreatorId, TeamRole.Owner);
        await memberRepository.AddAsync(ownerMember, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var allMembers = await memberRepository.FindAsync(m => m.TeamId == team.Id, cancellationToken);
        return await TeamDtoBuilder.BuildAsync(team, allMembers, userRepository, cancellationToken);
    }
}
