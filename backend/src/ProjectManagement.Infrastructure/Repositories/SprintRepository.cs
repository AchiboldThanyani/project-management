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
}
