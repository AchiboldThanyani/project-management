using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class SubTaskRepository(ApplicationDbContext db) : ISubTaskRepository
{
    public Task<SubTask?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.SubTasks.FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<IReadOnlyList<SubTask>> GetByTaskIdAsync(Guid taskId, CancellationToken ct = default)
        => await db.SubTasks.Where(s => s.TaskId == taskId).OrderBy(s => s.Order).ToListAsync(ct);

    public async Task AddAsync(SubTask subTask, CancellationToken ct = default)
        => await db.SubTasks.AddAsync(subTask, ct);

    public void Remove(SubTask subTask)
        => db.SubTasks.Remove(subTask);

    public Task SaveAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
