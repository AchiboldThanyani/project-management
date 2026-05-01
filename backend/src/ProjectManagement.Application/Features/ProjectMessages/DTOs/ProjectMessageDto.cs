namespace ProjectManagement.Application.Features.ProjectMessages.DTOs;

public record ProjectMessageDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public string AuthorId { get; init; } = default!;
    public string AuthorName { get; init; } = default!;
    public string Content { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
