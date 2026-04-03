using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Teams.AddTeamMember;

internal sealed class AddTeamMemberCommandHandler(
    ITeamRepository teamRepository,
    ITeamMemberRepository memberRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddTeamMemberCommand, Result<TeamDto>>
{
    public async Task<Result<TeamDto>> Handle(AddTeamMemberCommand request, CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByIdAsync(request.TeamId, cancellationToken);
        if (team is null)
            return TeamErrors.NotFound(request.TeamId);

        var existing = await memberRepository.FindAsync(
            m => m.TeamId == request.TeamId && m.UserId == request.UserId, cancellationToken);

        if (existing.Count > 0)
            return TeamErrors.MemberAlreadyExists;

        var member = TeamMember.Create(request.TeamId, request.UserId, request.Role);
        await memberRepository.AddAsync(member, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var allMembers = await memberRepository.FindAsync(m => m.TeamId == request.TeamId, cancellationToken);
        return await TeamDtoBuilder.BuildAsync(team, allMembers, userRepository, cancellationToken);
    }
}
