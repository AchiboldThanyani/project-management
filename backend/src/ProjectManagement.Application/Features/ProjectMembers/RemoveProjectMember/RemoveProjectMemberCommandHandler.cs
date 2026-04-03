using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMembers.RemoveProjectMember;

internal sealed class RemoveProjectMemberCommandHandler(
    IProjectMemberRepository repo,
    IUnitOfWork unitOfWork)
    : IRequestHandler<RemoveProjectMemberCommand, Result<Unit>>
{
    public async Task<Result<Unit>> Handle(
        RemoveProjectMemberCommand request, CancellationToken cancellationToken)
    {
        var members = await repo.FindAsync(
            m => m.ProjectId == request.ProjectId && m.UserId == request.UserId, cancellationToken);

        if (members.Count == 0)
            return Error.NotFound("ProjectMember.NotFound", "Member not found on this project.");

        members[0].SoftDelete();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
