using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TaskRepository(ApplicationDbContext context)
    : Repository<ProjectTask>(context), ITaskRepository
{
    // Always include labels so TaskDto.Labels is populated
    public override async Task<ProjectTask?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await context.Tasks.Include(t => t.Labels).FirstOrDefaultAsync(t => t.Id == id, ct);

    public override async Task<(IReadOnlyList<ProjectTask> Items, int TotalCount)> FindPagedAsync(
        Expression<Func<ProjectTask, bool>> predicate, int page, int pageSize, CancellationToken ct = default)
    {
        var query = context.Tasks.Include(t => t.Labels).Where(predicate);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task<ProjectTask?> GetByIdWithLabelsAsync(Guid taskId, CancellationToken ct = default) =>
        await context.Tasks.Include(t => t.Labels).FirstOrDefaultAsync(t => t.Id == taskId, ct);
}
