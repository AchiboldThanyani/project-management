using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Files.UploadVaultFile;

internal sealed class UploadVaultFileCommandHandler(
    IVaultFileRepository repository,
    IFileStorageService fileStorage,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UploadVaultFileCommand, Result<VaultFileDto>>
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv", "text/markdown", "text/x-markdown",
        "application/zip",
    ];

    private const long MaxBytes = 20 * 1024 * 1024;

    public async Task<Result<VaultFileDto>> Handle(UploadVaultFileCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "Members and above can upload files.");

        if (request.SizeBytes == 0)
            return Error.Validation("Vault.FileEmpty", "File is empty.");
        if (request.SizeBytes > MaxBytes)
            return Error.Validation("Vault.FileTooLarge", "File exceeds the 20 MB limit.");
        if (!AllowedTypes.Contains(request.ContentType))
            return Error.Validation("Vault.InvalidType", "File type is not allowed.");

        var ext = Path.GetExtension(request.FileName);
        var storedName = await fileStorage.SaveAsync(request.FileStream, ext, ct);

        var vaultFile = VaultFile.Create(
            request.ProjectId, request.FolderId,
            request.FileName, storedName,
            request.ContentType, request.SizeBytes,
            currentUser.UserId, currentUser.FullName);

        await repository.AddAsync(vaultFile, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFileDto>(vaultFile);
    }
}
