using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ICustomerProjectAccessRepository : IRepository<CustomerProjectAccess>
{
    Task<bool> HasAccessAsync(string userId, Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<CustomerProjectAccess>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<CustomerProjectAccess>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
}
