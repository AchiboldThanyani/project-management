using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Interfaces;

public interface ITimeLogRepository
{
    Task<TimeLog?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TimeLog>> GetByTaskIdAsync(Guid taskId, CancellationToken ct = default);
    Task AddAsync(TimeLog log, CancellationToken ct = default);
    void Remove(TimeLog log);
    Task SaveAsync(CancellationToken ct = default);
}
