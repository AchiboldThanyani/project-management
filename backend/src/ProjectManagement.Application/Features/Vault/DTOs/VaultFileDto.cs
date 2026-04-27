namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultFileDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public Guid? FolderId { get; init; }
    public string FileName { get; init; } = default!;
    public string ContentType { get; init; } = default!;
    public long SizeBytes { get; init; }
    public string UploadedById { get; init; } = default!;
    public string UploadedByName { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
