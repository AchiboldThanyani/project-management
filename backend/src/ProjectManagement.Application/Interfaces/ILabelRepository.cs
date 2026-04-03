using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface ILabelRepository : IRepository<Label>
{
    Task<IReadOnlyList<LabelDto>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<Label?> GetByIdWithTasksAsync(Guid labelId, CancellationToken ct = default);
    Task SeedDefaultLabelsAsync(Guid projectId, CancellationToken ct = default);
}
