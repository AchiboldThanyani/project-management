using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class ProjectInviteRepository(ApplicationDbContext context)
    : Repository<ProjectInvite>(context), IProjectInviteRepository
{
    public Task<ProjectInvite?> GetByTokenAsync(string token, CancellationToken ct = default)
        => context.ProjectInvites.Include(i => i.Project).FirstOrDefaultAsync(i => i.Token == token, ct);

    public async Task<IReadOnlyList<ProjectInvite>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.ProjectInvites
            .Where(i => i.ProjectId == projectId && !i.IsRevoked)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);
}
