using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IVaultFolderRepository : IRepository<VaultFolder>
{
    Task<IReadOnlyList<VaultFolder>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
}
