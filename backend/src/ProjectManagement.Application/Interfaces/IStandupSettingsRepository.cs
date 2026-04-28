using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IStandupSettingsRepository : IRepository<StandupSettings>
{
    Task<StandupSettings?> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<StandupSettings>> GetEnabledAsync(CancellationToken ct = default);
}
