namespace ProjectManagement.Application.Features.Invites.DTOs;

public record InviteDto
{
    public Guid     Id            { get; init; }
    public Guid     ProjectId     { get; init; }
    public string   ProjectName   { get; init; } = default!;
    public string   Token         { get; init; } = default!;
    public DateTime ExpiresAt     { get; init; }
    public bool     IsRevoked     { get; init; }
    public DateTime CreatedAt     { get; init; }
}
