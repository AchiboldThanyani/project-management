using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class CustomerProjectAccessRepository(ApplicationDbContext context)
    : Repository<CustomerProjectAccess>(context), ICustomerProjectAccessRepository
{
    public Task<bool> HasAccessAsync(string userId, Guid projectId, CancellationToken ct = default)
        => context.CustomerProjectAccesses.AnyAsync(a => a.UserId == userId && a.ProjectId == projectId, ct);

    public async Task<IReadOnlyList<CustomerProjectAccess>> GetByUserAsync(string userId, CancellationToken ct = default)
        => await context.CustomerProjectAccesses
            .Where(a => a.UserId == userId)
            .Include(a => a.Project)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CustomerProjectAccess>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.CustomerProjectAccesses
            .Where(a => a.ProjectId == projectId)
            .ToListAsync(ct);
}
