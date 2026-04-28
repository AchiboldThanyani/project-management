using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IVaultFileRepository : IRepository<VaultFile>
{
    Task<IReadOnlyList<VaultFile>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<VaultFile>> GetByFolderAsync(Guid folderId, Guid projectId, CancellationToken ct = default);
}
