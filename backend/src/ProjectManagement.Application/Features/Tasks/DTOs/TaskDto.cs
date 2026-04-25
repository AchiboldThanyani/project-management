using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Features.Tasks.Attachments;
using ProjectManagement.Application.Features.Tasks.Dependencies.DTOs;
using ProjectManagement.Application.Features.Tasks.SubTasks;
using ProjectManagement.Application.Features.Tasks.TimeLogs;
using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Tasks.DTOs;

public record TaskDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = default!;
    public string? Description { get; init; }
    public TaskStatus Status { get; init; }
    public TaskPriority Priority { get; init; }
    public DateTime? DueDate { get; init; }
    public int? StoryPoints { get; init; }
    public decimal? EstimatedHours { get; init; }
    public decimal TotalLoggedHours { get; init; }
    public Guid ProjectId { get; init; }
    public Guid? SprintId { get; init; }
    public string? AssigneeId { get; init; }
    public string? AssigneeName { get; init; }
    public string ReporterId { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public IReadOnlyList<LabelDto> Labels { get; init; } = [];
    public IReadOnlyList<SubTaskDto> SubTasks { get; init; } = [];
    public IReadOnlyList<TimeLogDto> TimeLogs { get; init; } = [];
    public IReadOnlyList<TaskAttachmentDto> Attachments { get; init; } = [];

    public IReadOnlyList<DependencyTaskRef> BlockedBy { get; init; } = [];
    public IReadOnlyList<DependencyTaskRef> Blocking { get; init; } = [];

    public bool IsBlocked => BlockedBy.Any(t =>
        t.Status != Domain.Enums.TaskStatus.Done &&
        t.Status != Domain.Enums.TaskStatus.Cancelled);
}

public record TaskCommentDto
{
    public Guid Id { get; init; }
    public string Content { get; init; } = default!;
    public string AuthorId { get; init; } = default!;
    public string AuthorName { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
