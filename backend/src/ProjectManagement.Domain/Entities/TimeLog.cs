using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class TimeLog : BaseEntity
{
    public Guid TaskId { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public decimal Hours { get; private set; }
    public string? Description { get; private set; }
    public DateOnly LoggedDate { get; private set; }

    public ProjectTask Task { get; set; } = null!;

    private TimeLog() { }

    public static TimeLog Create(Guid taskId, string userId, decimal hours, DateOnly loggedDate, string? description = null) => new()
    {
        TaskId = taskId,
        UserId = userId,
        Hours = hours,
        LoggedDate = loggedDate,
        Description = description,
    };
}
