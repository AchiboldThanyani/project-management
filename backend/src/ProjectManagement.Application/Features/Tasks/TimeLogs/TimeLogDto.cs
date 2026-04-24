namespace ProjectManagement.Application.Features.Tasks.TimeLogs;

public record TimeLogDto
{
    public Guid Id { get; init; }
    public Guid TaskId { get; init; }
    public string UserId { get; init; } = default!;
    public string? UserName { get; init; }
    public decimal Hours { get; init; }
    public string? Description { get; init; }
    public DateOnly LoggedDate { get; init; }
    public DateTime CreatedAt { get; init; }
}
