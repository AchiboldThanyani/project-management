using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocuments;

public sealed record GetVaultDocumentsQuery(Guid ProjectId, Guid? FolderId) : IQuery<IReadOnlyList<VaultDocumentDto>>;
