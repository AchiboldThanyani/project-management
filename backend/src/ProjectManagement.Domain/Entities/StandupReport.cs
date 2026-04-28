using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class StandupReport : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public DateTime GeneratedAt { get; private set; }
    public bool IsScheduled { get; private set; }
    public string? GeneratedById { get; private set; }
    public string ReportJson { get; private set; } = string.Empty;

    private StandupReport() { }

    public static StandupReport Create(
        Guid projectId, bool isScheduled, string? generatedById, string reportJson) =>
        new()
        {
            ProjectId = projectId,
            GeneratedAt = DateTime.UtcNow,
            IsScheduled = isScheduled,
            GeneratedById = generatedById,
            ReportJson = reportJson,
        };
}
