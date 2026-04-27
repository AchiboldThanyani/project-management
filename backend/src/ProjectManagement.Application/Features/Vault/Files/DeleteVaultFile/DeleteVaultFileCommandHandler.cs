using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Files.DeleteVaultFile;

internal sealed class DeleteVaultFileCommandHandler(
    IVaultFileRepository repository,
    IFileStorageService fileStorage,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteVaultFileCommand, Result>
{
    public async Task<Result> Handle(DeleteVaultFileCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var vaultFile = await repository.GetByIdAsync(request.FileId, ct);
        if (vaultFile is null) return Error.NotFound("Vault.FileNotFound", "File not found.");

        var isManager = await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct);
        if (!isManager && vaultFile.UploadedById != currentUser.UserId)
            return Error.Forbidden("Vault.Forbidden", "You can only delete your own files.");

        fileStorage.Delete(vaultFile.StoredFileName);
        await repository.DeleteAsync(vaultFile, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
