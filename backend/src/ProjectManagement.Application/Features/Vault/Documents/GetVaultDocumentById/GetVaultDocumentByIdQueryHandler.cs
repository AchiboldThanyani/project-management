using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocumentById;

internal sealed class GetVaultDocumentByIdQueryHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultDocumentByIdQuery, Result<VaultDocumentDetailDto>>
{
    public async Task<Result<VaultDocumentDetailDto>> Handle(GetVaultDocumentByIdQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        return mapper.Map<VaultDocumentDetailDto>(doc);
    }
}
