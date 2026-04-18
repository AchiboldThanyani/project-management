using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ITicketRepository : IRepository<Ticket>
{
    Task<int> NextNumberAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<Ticket>> GetByProjectAsync(Guid projectId, TicketStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<Ticket>> GetBySubmitterAsync(string userId, Guid? projectId, CancellationToken ct = default);
}
