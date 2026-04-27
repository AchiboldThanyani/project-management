using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.CreateVaultDocument;

internal sealed class CreateVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateVaultDocumentCommand, Result<VaultDocumentDto>>
{
    public async Task<Result<VaultDocumentDto>> Handle(CreateVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, ct))
            return Error.Forbidden("Vault.Forbidden", "Members and above can create documents.");

        var doc = VaultDocument.Create(
            request.Title, request.ProjectId, request.FolderId,
            currentUser.UserId, currentUser.FullName);
        await repository.AddAsync(doc, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDto>(doc);
    }
}
