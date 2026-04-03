namespace ProjectManagement.Application.Features.Messages.DTOs;

public record MessageDto
{
    public Guid Id { get; init; }
    public Guid TeamId { get; init; }
    public string AuthorId { get; init; } = default!;
    public string AuthorName { get; init; } = default!;
    public string Content { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
