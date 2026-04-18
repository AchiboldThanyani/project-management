using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Invites.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Invites.GenerateInvite;

internal sealed class GenerateInviteCommandHandler(
    IProjectInviteRepository repo,
    IProjectRepository projectRepo,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<GenerateInviteCommand, Result<InviteDto>>
{
    public async Task<Result<InviteDto>> Handle(GenerateInviteCommand request, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(request.ProjectId, ct);
        if (project is null) return Error.NotFound("Project.NotFound", "Project not found.");

        var invite = ProjectInvite.Create(request.ProjectId, currentUser.UserId);
        await repo.AddAsync(invite, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return new InviteDto { Id = invite.Id, ProjectId = invite.ProjectId,
            ProjectName = project.Name, Token = invite.Token,
            ExpiresAt = invite.ExpiresAt, CreatedAt = invite.CreatedAt };
    }
}
