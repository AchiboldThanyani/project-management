namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultDocumentDetailDto : VaultDocumentDto
{
    public string ContentJson { get; init; } = default!;
}
