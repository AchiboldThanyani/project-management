using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocuments;

internal sealed class GetVaultDocumentsQueryHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultDocumentsQuery, Result<IReadOnlyList<VaultDocumentDto>>>
{
    public async Task<Result<IReadOnlyList<VaultDocumentDto>>> Handle(GetVaultDocumentsQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var docs = request.FolderId.HasValue
            ? await repository.GetByFolderAsync(request.FolderId.Value, ct)
            : await repository.GetByProjectAsync(request.ProjectId, ct);

        return Result<IReadOnlyList<VaultDocumentDto>>.Success(mapper.Map<IReadOnlyList<VaultDocumentDto>>(docs));
    }
}
