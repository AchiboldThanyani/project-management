using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class SubTask : BaseEntity
{
    public Guid TaskId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public bool IsCompleted { get; private set; }
    public int Order { get; private set; }

    public ProjectTask Task { get; set; } = null!;

    private SubTask() { }

    public static SubTask Create(Guid taskId, string title, int order = 0) => new()
    {
        TaskId = taskId,
        Title = title,
        Order = order,
    };

    public void Toggle()
    {
        IsCompleted = !IsCompleted;
        SetUpdated();
    }

    public void Rename(string title)
    {
        Title = title;
        SetUpdated();
    }
}
