using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Issues.DTOs;

public record IssueDto
{
    public Guid Id { get; init; }
    public int Number { get; init; }
    public string Title { get; init; } = default!;
    public string? Description { get; init; }
    public IssueType Type { get; init; }
    public IssueStatus Status { get; init; }
    public TaskPriority Priority { get; init; }
    public Guid ProjectId { get; init; }
    public string ReporterId { get; init; } = default!;
    public string? ReporterName { get; init; }
    public string? AssigneeId { get; init; }
    public string? AssigneeName { get; init; }
    public Guid? ConvertedToTaskId { get; init; }
    public int CommentCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public record IssueCommentDto
{
    public Guid Id { get; init; }
    public string Content { get; init; } = default!;
    public string AuthorId { get; init; } = default!;
    public string? AuthorName { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
