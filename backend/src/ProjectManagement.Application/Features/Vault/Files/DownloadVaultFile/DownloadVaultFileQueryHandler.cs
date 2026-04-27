using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Files.DownloadVaultFile;

internal sealed class DownloadVaultFileQueryHandler(
    IVaultFileRepository repository,
    IFileStorageService fileStorage,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<DownloadVaultFileQuery, Result<VaultFileDownload>>
{
    public async Task<Result<VaultFileDownload>> Handle(DownloadVaultFileQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var vaultFile = await repository.GetByIdAsync(request.FileId, ct);
        if (vaultFile is null) return Error.NotFound("Vault.FileNotFound", "File not found.");

        var fullPath = fileStorage.GetFullPath(vaultFile.StoredFileName);
        return new VaultFileDownload(vaultFile.FileName, vaultFile.ContentType, fullPath);
    }
}
