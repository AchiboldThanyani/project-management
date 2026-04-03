using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Teams.RemoveTeamMember;

internal sealed class RemoveTeamMemberCommandHandler(
    ITeamRepository teamRepository,
    ITeamMemberRepository memberRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<RemoveTeamMemberCommand, Result<TeamDto>>
{
    public async Task<Result<TeamDto>> Handle(RemoveTeamMemberCommand request, CancellationToken cancellationToken)
    {
        var team = await teamRepository.GetByIdAsync(request.TeamId, cancellationToken);
        if (team is null)
            return TeamErrors.NotFound(request.TeamId);

        var members = await memberRepository.FindAsync(m => m.TeamId == request.TeamId, cancellationToken);

        var toRemove = members.FirstOrDefault(m => m.UserId == request.UserId);
        if (toRemove is null)
            return TeamErrors.MemberNotFound(request.UserId);

        await memberRepository.DeleteAsync(toRemove, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var remaining = await memberRepository.FindAsync(m => m.TeamId == request.TeamId, cancellationToken);
        return await TeamDtoBuilder.BuildAsync(team, remaining, userRepository, cancellationToken);
    }
}
