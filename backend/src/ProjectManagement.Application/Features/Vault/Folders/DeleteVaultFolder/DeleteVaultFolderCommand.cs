using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Folders.DeleteVaultFolder;

public sealed record DeleteVaultFolderCommand(Guid FolderId, Guid ProjectId) : ICommand<int>;
