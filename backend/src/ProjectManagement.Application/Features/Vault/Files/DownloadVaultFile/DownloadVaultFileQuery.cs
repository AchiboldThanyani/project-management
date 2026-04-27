using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Files.DownloadVaultFile;

public sealed record VaultFileDownload(string FileName, string ContentType, string FullPath);

public sealed record DownloadVaultFileQuery(Guid FileId, Guid ProjectId) : IQuery<VaultFileDownload>;
