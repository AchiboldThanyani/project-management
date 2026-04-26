using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class TimeLog : BaseEntity
{
    public Guid TaskId { get; private set; }
    public Guid? SubTaskId { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public decimal Hours { get; private set; }
    public string? Description { get; private set; }
    public DateOnly LoggedDate { get; private set; }

    public ProjectTask Task { get; set; } = null!;
    public SubTask? SubTask { get; set; }

    private TimeLog() { }

    public static TimeLog Create(Guid taskId, string userId, decimal hours, DateOnly loggedDate,
        string? description = null, Guid? subTaskId = null) => new()
    {
        TaskId = taskId,
        UserId = userId,
        Hours = hours,
        LoggedDate = loggedDate,
        Description = description,
        SubTaskId = subTaskId,
    };

    public void Update(decimal hours, string? description, DateOnly loggedDate)
    {
        Hours = hours;
        Description = description;
        LoggedDate = loggedDate;
        SetUpdated();
    }
}
