using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Files.MoveVaultFile;

public sealed record MoveVaultFileCommand(Guid FileId, Guid ProjectId, Guid? FolderId) : ICommand<VaultFileDto>;
