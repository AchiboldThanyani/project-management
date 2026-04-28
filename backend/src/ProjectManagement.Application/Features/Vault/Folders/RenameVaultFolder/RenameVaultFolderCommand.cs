using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Folders.RenameVaultFolder;

public sealed record RenameVaultFolderCommand(Guid FolderId, Guid ProjectId, string Name) : ICommand<VaultFolderDto>;
