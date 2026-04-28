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

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            return Error.Validation("Vault.InvalidDocumentTitle", "Document title must be between 1 and 200 characters.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null || doc.ProjectId != request.ProjectId) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        doc.Update(request.Title, request.ContentJson, currentUser.UserId, currentUser.FullName);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDetailDto>(doc);
    }
}
