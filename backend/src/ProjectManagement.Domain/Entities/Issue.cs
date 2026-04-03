using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities;

public class Issue : BaseEntity
{
    public int Number { get; private set; }         // sequential per project: #1, #2 …
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public IssueType Type { get; private set; } = IssueType.Bug;
    public IssueStatus Status { get; private set; } = IssueStatus.Open;
    public TaskPriority Priority { get; private set; } = TaskPriority.Medium;
    public Guid ProjectId { get; private set; }
    public string ReporterId { get; private set; } = string.Empty;
    public string? AssigneeId { get; private set; }
    public Guid? ConvertedToTaskId { get; private set; }   // set when promoted to a task

    public Project Project { get; set; } = null!;
    public ICollection<IssueComment> Comments { get; set; } = [];

    private Issue() { }

    public static Issue Create(
        int number,
        string title,
        Guid projectId,
        string reporterId,
        string? description = null,
        IssueType type = IssueType.Bug,
        TaskPriority priority = TaskPriority.Medium,
        string? assigneeId = null)
    {
        return new Issue
        {
            Number = number,
            Title = title,
            ProjectId = projectId,
            ReporterId = reporterId,
            Description = description,
            Type = type,
            Priority = priority,
            AssigneeId = assigneeId,
        };
    }

    public void Update(string title, string? description, IssueType type, TaskPriority priority, string? assigneeId)
    {
        Title = title;
        Description = description;
        Type = type;
        Priority = priority;
        AssigneeId = assigneeId;
        SetUpdated();
    }

    public void Close()
    {
        Status = IssueStatus.Closed;
        SetUpdated();
    }

    public void Reopen()
    {
        Status = IssueStatus.Open;
        SetUpdated();
    }

    public void MarkInProgress()
    {
        Status = IssueStatus.InProgress;
        SetUpdated();
    }

    public void MarkConvertedToTask(Guid taskId)
    {
        ConvertedToTaskId = taskId;
        Status = IssueStatus.Closed;
        SetUpdated();
    }
}
