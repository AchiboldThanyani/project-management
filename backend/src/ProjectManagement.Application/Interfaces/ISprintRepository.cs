using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ISprintRepository : IRepository<Sprint>
{
    Task<Sprint?> GetActiveSprintForProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Sprint>> GetFutureSprintsForProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
}
