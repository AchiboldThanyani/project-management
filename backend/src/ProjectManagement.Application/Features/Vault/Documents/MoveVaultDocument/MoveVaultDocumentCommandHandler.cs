using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.MoveVaultDocument;

internal sealed class MoveVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<MoveVaultDocumentCommand, Result<VaultDocumentDto>>
{
    public async Task<Result<VaultDocumentDto>> Handle(MoveVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "Members and above can move documents.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        doc.Move(request.FolderId);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDto>(doc);
    }
}
