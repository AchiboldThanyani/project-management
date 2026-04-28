using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class StandupSettings : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public bool IsEnabled { get; private set; }
    public TimeOnly ScheduledTime { get; private set; }
    public DateTime? LastRunAt { get; private set; }

    private StandupSettings() { }

    public static StandupSettings Create(Guid projectId) =>
        new() { ProjectId = projectId, IsEnabled = false, ScheduledTime = new TimeOnly(8, 0) };

    public void Update(bool isEnabled, TimeOnly scheduledTime)
    {
        IsEnabled = isEnabled;
        ScheduledTime = scheduledTime;
        SetUpdated();
    }

    public void MarkRun()
    {
        LastRunAt = DateTime.UtcNow;
        SetUpdated();
    }
}
