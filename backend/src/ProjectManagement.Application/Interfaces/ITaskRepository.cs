using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ITaskRepository : IRepository<ProjectTask>
{
    Task<ProjectTask?> GetByIdWithLabelsAsync(Guid taskId, CancellationToken ct = default);
    Task BulkUpdateSprintAsync(IEnumerable<Guid> taskIds, Guid? sprintId, CancellationToken ct);
    Task<int> GetNextTaskNumberAsync(Guid projectId, CancellationToken ct = default);
}
