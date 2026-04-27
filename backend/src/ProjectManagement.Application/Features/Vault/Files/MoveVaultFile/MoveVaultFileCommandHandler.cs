using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Files.MoveVaultFile;

internal sealed class MoveVaultFileCommandHandler(
    IVaultFileRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<MoveVaultFileCommand, Result<VaultFileDto>>
{
    public async Task<Result<VaultFileDto>> Handle(MoveVaultFileCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "Members and above can move files.");

        var vaultFile = await repository.GetByIdAsync(request.FileId, ct);
        if (vaultFile is null) return Error.NotFound("Vault.FileNotFound", "File not found.");

        vaultFile.Move(request.FolderId);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFileDto>(vaultFile);
    }
}
