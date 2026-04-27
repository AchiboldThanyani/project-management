using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Files.GetVaultFiles;

internal sealed class GetVaultFilesQueryHandler(
    IVaultFileRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultFilesQuery, Result<IReadOnlyList<VaultFileDto>>>
{
    public async Task<Result<IReadOnlyList<VaultFileDto>>> Handle(GetVaultFilesQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var vaultFiles = request.FolderId.HasValue
            ? await repository.GetByFolderAsync(request.FolderId.Value, ct)
            : await repository.GetByProjectAsync(request.ProjectId, ct);

        return Result<IReadOnlyList<VaultFileDto>>.Success(mapper.Map<IReadOnlyList<VaultFileDto>>(vaultFiles));
    }
}
