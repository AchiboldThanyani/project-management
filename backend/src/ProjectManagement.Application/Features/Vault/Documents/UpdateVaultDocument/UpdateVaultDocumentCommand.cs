using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.UpdateVaultDocument;

public sealed record UpdateVaultDocumentCommand(
    Guid DocumentId, Guid ProjectId,
    string Title, string ContentJson) : ICommand<VaultDocumentDetailDto>;
