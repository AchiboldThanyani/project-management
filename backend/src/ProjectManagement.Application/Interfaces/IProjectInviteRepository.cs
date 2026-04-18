using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IProjectInviteRepository : IRepository<ProjectInvite>
{
    Task<ProjectInvite?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectInvite>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
}
