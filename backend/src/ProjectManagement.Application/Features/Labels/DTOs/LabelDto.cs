namespace ProjectManagement.Application.Features.Labels.DTOs;

public record LabelDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string Color { get; init; } = default!;
    public Guid ProjectId { get; init; }
}
