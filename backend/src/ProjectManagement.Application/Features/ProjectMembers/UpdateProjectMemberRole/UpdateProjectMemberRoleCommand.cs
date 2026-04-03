using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.ProjectMembers.UpdateProjectMemberRole;

public record UpdateProjectMemberRoleCommand(Guid ProjectId, string UserId, ProjectMemberRole Role)
    : IRequest<Result<ProjectMemberDto>>;
