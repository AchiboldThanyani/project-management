using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Files.GetVaultFiles;

public sealed record GetVaultFilesQuery(Guid ProjectId, Guid? FolderId) : IQuery<IReadOnlyList<VaultFileDto>>;
