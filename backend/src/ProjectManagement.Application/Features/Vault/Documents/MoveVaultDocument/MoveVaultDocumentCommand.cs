using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.MoveVaultDocument;

public sealed record MoveVaultDocumentCommand(Guid DocumentId, Guid ProjectId, Guid? FolderId) : ICommand<VaultDocumentDto>;
