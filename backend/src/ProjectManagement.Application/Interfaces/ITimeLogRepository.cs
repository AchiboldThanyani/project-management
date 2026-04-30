using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ITimeLogRepository : IRepository<TimeLog>
{
    Task<IReadOnlyList<TimeLog>> GetByTaskIdAsync(Guid taskId, CancellationToken ct = default);
    Task<IReadOnlyList<TimeLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateOnly date, CancellationToken ct = default);
    Task<IReadOnlyList<TimeLog>> GetByProjectSinceAsync(
        Guid projectId, DateOnly since, CancellationToken ct = default);
    void Remove(TimeLog log);
    Task SaveAsync(CancellationToken ct = default);
}
