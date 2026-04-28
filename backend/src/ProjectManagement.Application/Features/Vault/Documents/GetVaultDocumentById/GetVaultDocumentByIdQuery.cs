using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocumentById;

public sealed record GetVaultDocumentByIdQuery(Guid DocumentId, Guid ProjectId) : IQuery<VaultDocumentDetailDto>;
