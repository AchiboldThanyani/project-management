namespace ProjectManagement.Application.Features.Sprints.DTOs;

public record SprintDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string? Goal { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; }
    public Guid ProjectId { get; init; }
    public DateTime CreatedAt { get; init; }
}
