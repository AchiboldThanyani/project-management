namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultDocumentDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public Guid? FolderId { get; init; }
    public string Title { get; init; } = default!;
    public string CreatedById { get; init; } = default!;
    public string CreatedByName { get; init; } = default!;
    public string? UpdatedById { get; init; }
    public string? UpdatedByName { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
