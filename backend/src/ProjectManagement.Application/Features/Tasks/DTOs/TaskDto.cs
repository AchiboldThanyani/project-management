using ProjectManagement.Application.Features.Labels.DTOs;
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
    public Guid ProjectId { get; init; }
    public Guid? SprintId { get; init; }
    public string? AssigneeId { get; init; }
    public string? AssigneeName { get; init; }
    public string ReporterId { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public IReadOnlyList<LabelDto> Labels { get; init; } = [];
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
