using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Folders.DeleteVaultFolder;

internal sealed class DeleteVaultFolderCommandHandler(
    IVaultFolderRepository folders,
    IVaultDocumentRepository documents,
    IVaultFileRepository files,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteVaultFolderCommand, Result<int>>
{
    public async Task<Result<int>> Handle(DeleteVaultFolderCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Vault.Forbidden", "Only Managers and above can delete folders.");

        var folder = await folders.GetByIdAsync(request.FolderId, ct);
        if (folder is null || folder.ProjectId != request.ProjectId) return Error.NotFound("Vault.FolderNotFound", "Folder not found.");

        var folderDocs = await documents.GetByFolderAsync(request.FolderId, request.ProjectId, ct);
        var folderFiles = await files.GetByFolderAsync(request.FolderId, request.ProjectId, ct);
        int movedCount = folderDocs.Count + folderFiles.Count;

        foreach (var doc in folderDocs) doc.Move(null);
        foreach (var file in folderFiles) file.Move(null);

        await folders.DeleteAsync(folder, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return movedCount;
    }
}
