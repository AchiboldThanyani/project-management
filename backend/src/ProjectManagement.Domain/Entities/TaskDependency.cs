using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

/// <summary>
/// BlockingTaskId must be completed before BlockedTaskId can start.
/// Read as: "BlockingTask blocks BlockedTask".
/// </summary>
public class TaskDependency : BaseEntity
{
    public Guid BlockingTaskId { get; private set; }
    public Guid BlockedTaskId  { get; private set; }

    public ProjectTask BlockingTask { get; set; } = null!;
    public ProjectTask BlockedTask  { get; set; } = null!;

    private TaskDependency() { }

    public static TaskDependency Create(Guid blockingTaskId, Guid blockedTaskId) =>
        new() { BlockingTaskId = blockingTaskId, BlockedTaskId = blockedTaskId };
}
