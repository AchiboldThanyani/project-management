using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Teams.DTOs;

public record TeamDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<TeamMemberDto> Members { get; init; } = [];
}

public record TeamMemberDto
{
    public string UserId { get; init; } = default!;
    public string FullName { get; init; } = default!;
    public string Email { get; init; } = default!;
    public TeamRole Role { get; init; }
    public DateTime JoinedAt { get; init; }
}
