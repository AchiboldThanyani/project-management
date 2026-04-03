using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.ProjectMembers.DTOs;

public record ProjectMemberDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public string UserId { get; init; } = default!;
    public string FullName { get; init; } = default!;
    public string Email { get; init; } = default!;
    public ProjectMemberRole Role { get; init; }
    public int OpenTaskCount { get; init; }
    public DateTime JoinedAt { get; init; }
}
