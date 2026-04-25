using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Interfaces;

public interface ITaskAttachmentRepository
{
    Task<TaskAttachment?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(TaskAttachment attachment, CancellationToken ct = default);
    void Remove(TaskAttachment attachment);
}
