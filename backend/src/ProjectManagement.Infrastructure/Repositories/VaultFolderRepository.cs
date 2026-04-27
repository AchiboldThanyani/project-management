using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class VaultFolderRepository(ApplicationDbContext context)
    : Repository<VaultFolder>(context), IVaultFolderRepository
{
    public async Task<IReadOnlyList<VaultFolder>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.VaultFolders
            .Where(f => f.ProjectId == projectId)
            .OrderBy(f => f.Name)
            .ToListAsync(ct);
}
