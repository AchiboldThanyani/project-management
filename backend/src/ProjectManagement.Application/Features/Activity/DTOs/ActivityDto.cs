namespace ProjectManagement.Application.Features.Activity.DTOs;

public record ActivityDto
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = default!;
    public string UserName { get; init; } = default!;
    public string Action { get; init; } = default!;
    public string EntityType { get; init; } = default!;
    public Guid? EntityId { get; init; }
    public string EntityName { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
