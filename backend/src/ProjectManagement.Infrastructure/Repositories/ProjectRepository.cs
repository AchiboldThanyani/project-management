using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class ProjectRepository(ApplicationDbContext context)
    : Repository<Project>(context), IProjectRepository
{
    public async Task<(IReadOnlyList<Project> Items, int TotalCount)> GetProjectsForUserAsync(
        string userId, bool isAdmin, int page, int pageSize, CancellationToken ct = default)
    {
        var query = context.Projects.AsQueryable();

        if (!isAdmin)
            query = query.Where(p =>
                p.OwnerId == userId ||
                context.ProjectMembers.Any(m => m.ProjectId == p.Id && m.UserId == userId));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
