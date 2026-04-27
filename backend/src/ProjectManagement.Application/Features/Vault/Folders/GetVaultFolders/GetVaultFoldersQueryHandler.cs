using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Folders.GetVaultFolders;

internal sealed class GetVaultFoldersQueryHandler(
    IVaultFolderRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultFoldersQuery, Result<IReadOnlyList<VaultFolderDto>>>
{
    public async Task<Result<IReadOnlyList<VaultFolderDto>>> Handle(GetVaultFoldersQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var folders = await repository.GetByProjectAsync(request.ProjectId, ct);
        return Result<IReadOnlyList<VaultFolderDto>>.Success(mapper.Map<IReadOnlyList<VaultFolderDto>>(folders));
    }
}
