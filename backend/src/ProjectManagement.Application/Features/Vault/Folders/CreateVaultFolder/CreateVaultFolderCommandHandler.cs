using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Folders.CreateVaultFolder;

internal sealed class CreateVaultFolderCommandHandler(
    IVaultFolderRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateVaultFolderCommand, Result<VaultFolderDto>>
{
    public async Task<Result<VaultFolderDto>> Handle(CreateVaultFolderCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Vault.Forbidden", "Only Managers and above can create folders.");

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 100)
            return Error.Validation("Vault.InvalidFolderName", "Folder name must be between 1 and 100 characters.");

        var folder = VaultFolder.Create(request.Name, request.ProjectId, currentUser.UserId);
        await repository.AddAsync(folder, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFolderDto>(folder);
    }
}
