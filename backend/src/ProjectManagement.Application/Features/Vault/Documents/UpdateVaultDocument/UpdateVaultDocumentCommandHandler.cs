using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.UpdateVaultDocument;

internal sealed class UpdateVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateVaultDocumentCommand, Result<VaultDocumentDetailDto>>
{
    public async Task<Result<VaultDocumentDetailDto>> Handle(UpdateVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "Members and above can edit documents.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        doc.Update(request.Title, request.ContentJson, currentUser.UserId, currentUser.FullName);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDetailDto>(doc);
    }
}
