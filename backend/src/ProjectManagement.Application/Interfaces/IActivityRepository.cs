using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IActivityRepository : IRepository<ActivityLog>
{
    Task<IReadOnlyList<ActivityLog>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ActivityLog>> GetByProjectAndUserAsync(
        Guid projectId, string userId, DateTime since, CancellationToken ct = default);
}
