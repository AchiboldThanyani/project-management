using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GetStandupSettings;

internal sealed class GetStandupSettingsQueryHandler(
    IStandupSettingsRepository settingsRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GetStandupSettingsQuery, Result<StandupSettingsDto>>
{
    public async Task<Result<StandupSettingsDto>> Handle(GetStandupSettingsQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Standup.Forbidden", "You do not have access to this project.");

        var settings = await settingsRepo.GetByProjectAsync(request.ProjectId, ct);
        if (settings == null)
            return new StandupSettingsDto(request.ProjectId, false, "08:00");

        return new StandupSettingsDto(settings.ProjectId, settings.IsEnabled, settings.ScheduledTime.ToString("HH:mm"));
    }
}
