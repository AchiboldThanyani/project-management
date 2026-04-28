using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Folders.GetVaultFolders;

public sealed record GetVaultFoldersQuery(Guid ProjectId) : IQuery<IReadOnlyList<VaultFolderDto>>;
