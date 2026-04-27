using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.CreateVaultDocument;

public sealed record CreateVaultDocumentCommand(string Title, Guid ProjectId, Guid? FolderId) : ICommand<VaultDocumentDto>;
