using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Services;

internal sealed class ProjectPermissionService(
    ApplicationDbContext db,
    ICurrentUserService currentUser) : IProjectPermissionService
{
    public async Task<bool> HasProjectRoleAsync(
        Guid projectId, string userId, ProjectMemberRole minimumRole, CancellationToken ct = default)
    {
        if (currentUser.IsAdmin) return true;

        var role = await db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.UserId == userId)
            .Select(m => (ProjectMemberRole?)m.Role)
            .FirstOrDefaultAsync(ct);

        return role.HasValue && role.Value >= minimumRole;
    }

    public async Task<bool> HasTeamRoleAsync(
        Guid teamId, string userId, TeamRole minimumRole, CancellationToken ct = default)
    {
        if (currentUser.IsAdmin) return true;

        var role = await db.TeamMembers
            .Where(m => m.TeamId == teamId && m.UserId == userId)
            .Select(m => (TeamRole?)m.Role)
            .FirstOrDefaultAsync(ct);

        return role.HasValue && role.Value >= minimumRole;
    }
}
