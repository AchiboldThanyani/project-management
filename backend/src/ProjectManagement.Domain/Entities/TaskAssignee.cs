namespace ProjectManagement.Domain.Entities;

public class TaskAssignee
{
    public Guid TaskId { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;

    public ProjectTask Task { get; private set; } = null!;

    private TaskAssignee() { }

    public static TaskAssignee Create(Guid taskId, string userId, string fullName) =>
        new() { TaskId = taskId, UserId = userId, FullName = fullName };
}
