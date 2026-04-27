using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IVaultDocumentRepository : IRepository<VaultDocument>
{
    Task<IReadOnlyList<VaultDocument>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<VaultDocument>> GetByFolderAsync(Guid folderId, CancellationToken ct = default);
}
