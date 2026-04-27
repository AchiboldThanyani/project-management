using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class VaultFileRepository(ApplicationDbContext context)
    : Repository<VaultFile>(context), IVaultFileRepository
{
    public async Task<IReadOnlyList<VaultFile>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.VaultFiles
            .Where(f => f.ProjectId == projectId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<VaultFile>> GetByFolderAsync(Guid folderId, CancellationToken ct = default)
        => await context.VaultFiles
            .Where(f => f.FolderId == folderId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);
}
