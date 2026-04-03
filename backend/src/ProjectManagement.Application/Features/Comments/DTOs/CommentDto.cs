namespace ProjectManagement.Application.Features.Comments.DTOs;

public record CommentDto
{
    public Guid Id { get; init; }
    public string Content { get; init; } = default!;
    public string AuthorId { get; init; } = default!;
    public string AuthorName { get; init; } = default!;
    public Guid TaskId { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
