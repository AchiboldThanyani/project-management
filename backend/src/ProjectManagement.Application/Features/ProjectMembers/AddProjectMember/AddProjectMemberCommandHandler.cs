using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMembers.AddProjectMember;

internal sealed class AddProjectMemberCommandHandler(
    IProjectMemberRepository repo,
    IProjectRepository projectRepo,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUserRepository users,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddProjectMemberCommand, Result<ProjectMemberDto>>
{
    public async Task<Result<ProjectMemberDto>> Handle(
        AddProjectMemberCommand request, CancellationToken cancellationToken)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, cancellationToken))
            return Error.Forbidden("ProjectMember.Forbidden", "You must be a Manager to add project members.");

        var existing = await repo.FindAsync(
            m => m.ProjectId == request.ProjectId && m.UserId == request.UserId, cancellationToken);

        if (existing.Count > 0)
            return Error.Conflict("ProjectMember.AlreadyExists", "User is already a member of this project.");

        // ProjectManagers are always assigned Manager role regardless of what was requested
        var systemRole = await users.GetRoleAsync(request.UserId, cancellationToken);
        var role = systemRole == UserRole.ProjectManager ? ProjectMemberRole.Manager : request.Role;

        var member = ProjectMember.Create(request.ProjectId, request.UserId, role);
        await repo.AddAsync(member, cancellationToken);

        // Stage notification for the new member
        var project = await projectRepo.GetByIdAsync(request.ProjectId, cancellationToken);
        var projectName = project?.Name ?? "a project";
        var n = Notification.Create(
            userId: request.UserId,
            title: "Added to project",
            body: $"You have been added to \"{projectName}\"",
            type: NotificationType.AddedToProject,
            relatedEntityId: request.ProjectId);
        await notificationRepo.AddAsync(n, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Fire real-time push after DB row exists
        await notificationService.NotifyUser(
            request.UserId, "Added to project",
            $"You have been added to \"{projectName}\"",
            NotificationType.AddedToProject, request.ProjectId, cancellationToken);

        var dto = await repo.GetDtoByIdAsync(member.Id, cancellationToken);
        return dto ?? new ProjectMemberDto
        {
            Id = member.Id, ProjectId = member.ProjectId,
            UserId = member.UserId, Role = member.Role, JoinedAt = member.CreatedAt,
        };
    }
}
