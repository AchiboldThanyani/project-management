using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.ProjectMembers.RemoveProjectMember;

public record RemoveProjectMemberCommand(Guid ProjectId, string UserId) : IRequest<Result<Unit>>;
