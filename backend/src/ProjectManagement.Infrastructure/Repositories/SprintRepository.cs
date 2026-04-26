using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class SprintRepository(ApplicationDbContext context)
    : Repository<Sprint>(context), ISprintRepository
{
    public Task<Sprint?> GetActiveSprintForProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
        => context.Sprints
            .FirstOrDefaultAsync(s => s.ProjectId == projectId && s.IsActive, cancellationToken);

    public async Task<IReadOnlyList<Sprint>> GetFutureSprintsForProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
        => await context.Sprints
            .Where(s => s.ProjectId == projectId && !s.IsActive && !s.IsCompleted)
            .OrderBy(s => s.StartDate)
            .ToListAsync(cancellationToken);
}
