using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Folders.CreateVaultFolder;

public sealed record CreateVaultFolderCommand(string Name, Guid ProjectId) : ICommand<VaultFolderDto>;
