namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultFolderDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public string Name { get; init; } = default!;
    public string CreatedById { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
