using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TicketCommentRepository(ApplicationDbContext context)
    : Repository<TicketComment>(context), ITicketCommentRepository
{
    public async Task<IReadOnlyList<TicketComment>> GetByTicketAsync(Guid ticketId, CancellationToken ct = default)
        => await context.TicketComments
            .Where(c => c.TicketId == ticketId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);
}
