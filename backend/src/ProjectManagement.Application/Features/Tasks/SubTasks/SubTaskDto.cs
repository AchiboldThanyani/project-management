namespace ProjectManagement.Application.Features.Tasks.SubTasks;

public record SubTaskDto
{
    public Guid Id { get; init; }
    public Guid TaskId { get; init; }
    public string Title { get; init; } = default!;
    public bool IsCompleted { get; init; }
    public int Order { get; init; }
    public DateTime CreatedAt { get; init; }
}
