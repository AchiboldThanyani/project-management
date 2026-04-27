using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class VaultDocumentRepository(ApplicationDbContext context)
    : Repository<VaultDocument>(context), IVaultDocumentRepository
{
    public async Task<IReadOnlyList<VaultDocument>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.VaultDocuments
            .Where(d => d.ProjectId == projectId)
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<VaultDocument>> GetByFolderAsync(Guid folderId, CancellationToken ct = default)
        => await context.VaultDocuments
            .Where(d => d.FolderId == folderId)
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .ToListAsync(ct);
}
