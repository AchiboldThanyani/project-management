using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ITicketCommentRepository : IRepository<TicketComment>
{
    Task<IReadOnlyList<TicketComment>> GetByTicketAsync(Guid ticketId, CancellationToken ct = default);
}
