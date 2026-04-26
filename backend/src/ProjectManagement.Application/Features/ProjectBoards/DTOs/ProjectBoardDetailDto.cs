namespace ProjectManagement.Application.Features.ProjectBoards.DTOs;

public record ProjectBoardDetailDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = default!;
    public string ContentJson { get; init; } = default!;
    public Guid ProjectId { get; init; }
    public string CreatedById { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
