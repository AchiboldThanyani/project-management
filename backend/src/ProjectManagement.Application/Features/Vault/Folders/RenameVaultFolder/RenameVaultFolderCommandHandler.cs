using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Folders.RenameVaultFolder;

internal sealed class RenameVaultFolderCommandHandler(
    IVaultFolderRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<RenameVaultFolderCommand, Result<VaultFolderDto>>
{
    public async Task<Result<VaultFolderDto>> Handle(RenameVaultFolderCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Vault.Forbidden", "Only Managers and above can rename folders.");

        var folder = await repository.GetByIdAsync(request.FolderId, ct);
        if (folder is null) return Error.NotFound("Vault.FolderNotFound", "Folder not found.");

        folder.Rename(request.Name);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFolderDto>(folder);
    }
}
