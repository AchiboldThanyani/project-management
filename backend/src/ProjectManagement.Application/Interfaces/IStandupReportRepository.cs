using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IStandupReportRepository : IRepository<StandupReport>
{
    Task<IReadOnlyList<StandupReport>> GetByProjectAsync(Guid projectId, int count, CancellationToken ct = default);
}
