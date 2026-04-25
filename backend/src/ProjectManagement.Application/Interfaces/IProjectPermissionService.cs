using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Interfaces;

public interface IProjectPermissionService
{
    Task<bool> HasProjectRoleAsync(Guid projectId, string userId, ProjectMemberRole minimumRole, CancellationToken ct = default);
    Task<bool> HasTeamRoleAsync(Guid teamId, string userId, TeamRole minimumRole, CancellationToken ct = default);
}
