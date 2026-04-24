using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Interfaces;

public interface ISubTaskRepository
{
    Task<SubTask?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<SubTask>> GetByTaskIdAsync(Guid taskId, CancellationToken ct = default);
    Task AddAsync(SubTask subTask, CancellationToken ct = default);
    void Remove(SubTask subTask);
    Task SaveAsync(CancellationToken ct = default);
}
