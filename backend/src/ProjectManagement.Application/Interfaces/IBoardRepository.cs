using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IBoardRepository : IRepository<ProjectBoard>
{
    Task<IReadOnlyList<ProjectBoard>> GetBoardsByProjectAsync(Guid projectId, CancellationToken ct = default);
}
