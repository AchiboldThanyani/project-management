using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Persistence;
using DomainTaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Infrastructure.Repositories;

public class ProjectMemberRepository(ApplicationDbContext db)
    : Repository<ProjectMember>(db), IProjectMemberRepository
{
    public async Task<IReadOnlyList<ProjectMemberDto>> GetByProjectAsync(
        Guid projectId, CancellationToken ct = default)
    {
        return await db.ProjectMembers
            .Where(m => m.ProjectId == projectId)
            .Join(db.Users,
                m => m.UserId,
                u => u.Id,
                (m, u) => new { m, u })
            .Select(x => new ProjectMemberDto
            {
                Id          = x.m.Id,
                ProjectId   = x.m.ProjectId,
                UserId      = x.m.UserId,
                FullName    = x.u.FirstName + " " + x.u.LastName,
                Email       = x.u.Email ?? string.Empty,
                Role        = x.m.Role,
                OpenTaskCount = db.Tasks.Count(t =>
                    t.ProjectId == projectId &&
                    t.AssigneeId == x.m.UserId &&
                    t.Status != DomainTaskStatus.Done &&
                    t.Status != DomainTaskStatus.Cancelled),
                JoinedAt    = x.m.CreatedAt,
            })
            .OrderBy(x => x.Role == ProjectMemberRole.Manager ? 0 : x.Role == ProjectMemberRole.Lead ? 1 : x.Role == ProjectMemberRole.Member ? 2 : 3)
            .ThenBy(x => x.FullName)
            .ToListAsync(ct);
    }

    public async Task<ProjectMemberDto?> GetDtoByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.ProjectMembers
            .Where(m => m.Id == id)
            .Join(db.Users,
                m => m.UserId,
                u => u.Id,
                (m, u) => new { m, u })
            .Select(x => new ProjectMemberDto
            {
                Id          = x.m.Id,
                ProjectId   = x.m.ProjectId,
                UserId      = x.m.UserId,
                FullName    = x.u.FirstName + " " + x.u.LastName,
                Email       = x.u.Email ?? string.Empty,
                Role        = x.m.Role,
                OpenTaskCount = db.Tasks.Count(t =>
                    t.ProjectId == x.m.ProjectId &&
                    t.AssigneeId == x.m.UserId &&
                    t.Status != DomainTaskStatus.Done &&
                    t.Status != DomainTaskStatus.Cancelled),
                JoinedAt    = x.m.CreatedAt,
            })
            .FirstOrDefaultAsync(ct);
    }
}
