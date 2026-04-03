using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;

namespace ProjectManagement.Application.Features.ProjectMembers.GetProjectMembers;

public record GetProjectMembersQuery(Guid ProjectId) : IRequest<Result<IReadOnlyList<ProjectMemberDto>>>;
