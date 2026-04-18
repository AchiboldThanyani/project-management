using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TicketRepository(ApplicationDbContext context)
    : Repository<Ticket>(context), ITicketRepository
{
    public async Task<int> NextNumberAsync(Guid projectId, CancellationToken ct = default)
    {
        var max = await context.Tickets
            .IgnoreQueryFilters()
            .Where(t => t.ProjectId == projectId)
            .MaxAsync(t => (int?)t.Number, ct);
        return (max ?? 0) + 1;
    }

    public async Task<IReadOnlyList<Ticket>> GetByProjectAsync(Guid projectId, TicketStatus? status, CancellationToken ct = default)
    {
        var q = context.Tickets.Where(t => t.ProjectId == projectId);
        if (status.HasValue) q = q.Where(t => t.Status == status.Value);
        return await q.OrderByDescending(t => t.Number).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Ticket>> GetBySubmitterAsync(string userId, Guid? projectId, CancellationToken ct = default)
    {
        var q = context.Tickets.Where(t => t.SubmittedById == userId);
        if (projectId.HasValue) q = q.Where(t => t.ProjectId == projectId.Value);
        return await q.OrderByDescending(t => t.Number).ToListAsync(ct);
    }
}
