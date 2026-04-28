using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Documents.DeleteVaultDocument;

public sealed record DeleteVaultDocumentCommand(Guid DocumentId, Guid ProjectId) : ICommand;
