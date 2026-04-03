using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Projects.DTOs;

public record ProjectDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public ProjectStatus Status { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public Guid? TeamId { get; init; }
    public string OwnerId { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public record ProjectSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public ProjectStatus Status { get; init; }
    public int TaskCount { get; init; }
    public int CompletedTaskCount { get; init; }
}
