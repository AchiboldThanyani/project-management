using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TaskAttachmentRepository(ApplicationDbContext db) : ITaskAttachmentRepository
{
    public Task<TaskAttachment?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.TaskAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task AddAsync(TaskAttachment attachment, CancellationToken ct = default)
        => await db.TaskAttachments.AddAsync(attachment, ct);

    public void Remove(TaskAttachment attachment)
        => db.TaskAttachments.Remove(attachment);
}
