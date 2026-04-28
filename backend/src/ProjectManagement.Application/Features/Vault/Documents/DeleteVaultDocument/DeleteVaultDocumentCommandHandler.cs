using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.DeleteVaultDocument;

internal sealed class DeleteVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteVaultDocumentCommand, Result>
{
    public async Task<Result> Handle(DeleteVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null || doc.ProjectId != request.ProjectId) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        var isManager = await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct);
        if (!isManager && doc.CreatedById != currentUser.UserId)
            return Error.Forbidden("Vault.Forbidden", "You can only delete your own documents.");

        await repository.DeleteAsync(doc, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
