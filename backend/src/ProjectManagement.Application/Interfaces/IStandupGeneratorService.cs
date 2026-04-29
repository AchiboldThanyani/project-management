using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Interfaces;

public interface IStandupGeneratorService
{
    Task<StandupReport> GenerateAsync(
        Guid projectId, bool isScheduled, string? generatedById, CancellationToken ct = default);
}
