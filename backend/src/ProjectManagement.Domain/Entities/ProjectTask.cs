using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Events;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Domain.Entities;

public class ProjectTask : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public TaskStatus Status { get; private set; } = TaskStatus.Todo;
    public TaskPriority Priority { get; private set; } = TaskPriority.Medium;
    public DateTime? DueDate { get; private set; }
    public int? StoryPoints { get; private set; }
    public Guid ProjectId { get; private set; }
    public Guid? SprintId { get; private set; }
    public string? AssigneeId { get; private set; }
    public string ReporterId { get; private set; } = string.Empty;

    public decimal? EstimatedHours { get; private set; }

    public Project Project { get; set; } = null!;
    public Sprint? Sprint { get; set; }
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Label> Labels { get; set; } = [];
    public ICollection<SubTask> SubTasks { get; set; } = [];
    public ICollection<TimeLog> TimeLogs { get; set; } = [];
    public ICollection<TaskAttachment> Attachments { get; set; } = [];

    // Dependencies where this task is the one being blocked
    public ICollection<TaskDependency> BlockedByDependencies { get; set; } = [];
    // Dependencies where this task is the blocker
    public ICollection<TaskDependency> BlockingDependencies { get; set; } = [];

    private ProjectTask() { }

    public static ProjectTask Create(string title, Guid projectId, string reporterId,
        string? description = null, TaskPriority priority = TaskPriority.Medium,
        DateTime? dueDate = null, Guid? sprintId = null, string? assigneeId = null,
        int? storyPoints = null, decimal? estimatedHours = null)
    {
        return new ProjectTask
        {
            Title = title,
            ProjectId = projectId,
            ReporterId = reporterId,
            Description = description,
            Priority = priority,
            DueDate = AsUtc(dueDate),
            SprintId = sprintId,
            AssigneeId = assigneeId,
            StoryPoints = storyPoints,
            EstimatedHours = estimatedHours,
        };
    }

    public void Update(string title, string? description, TaskPriority priority,
        DateTime? dueDate, Guid? sprintId, string? assigneeId, int? storyPoints,
        string updatedByUserId = "", decimal? estimatedHours = null)
    {
        var previousAssignee = AssigneeId;
        Title = title;
        Description = description;
        Priority = priority;
        DueDate = AsUtc(dueDate);
        SprintId = sprintId;
        AssigneeId = assigneeId;
        StoryPoints = storyPoints;
        EstimatedHours = estimatedHours;
        SetUpdated();

        if (!string.IsNullOrEmpty(assigneeId) && assigneeId != previousAssignee)
            RaiseDomainEvent(new TaskAssignedEvent(Id, Title, ProjectId, assigneeId, updatedByUserId));
    }

    public void ChangeStatus(TaskStatus newStatus, string changedByUserId)
    {
        var oldStatus = Status;
        Status = newStatus;
        SetUpdated();
        RaiseDomainEvent(new TaskStatusChangedEvent(Id, Title, ProjectId, oldStatus, newStatus, changedByUserId));
    }
}
