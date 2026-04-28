using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Files.UploadVaultFile;

public sealed record UploadVaultFileCommand(
    Guid ProjectId,
    Guid? FolderId,
    string FileName,
    string ContentType,
    long SizeBytes,
    Stream FileStream) : ICommand<VaultFileDto>;
