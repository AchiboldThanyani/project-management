using System.Globalization;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Standup.UpdateStandupSettings;

internal sealed class UpdateStandupSettingsCommandHandler(
    IStandupSettingsRepository settingsRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateStandupSettingsCommand, Result<StandupSettingsDto>>
{
    public async Task<Result<StandupSettingsDto>> Handle(UpdateStandupSettingsCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Standup.Forbidden", "Only project managers can configure standup settings.");

        if (!TimeOnly.TryParseExact(request.ScheduledTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var scheduledTime))
            return Error.Validation("Standup.InvalidTime", "ScheduledTime must be in HH:mm format.");

        var settings = await settingsRepo.GetByProjectAsync(request.ProjectId, ct);
        if (settings == null)
        {
            settings = StandupSettings.Create(request.ProjectId);
            await settingsRepo.AddAsync(settings, ct);
        }

        settings.Update(request.IsEnabled, scheduledTime);
        await unitOfWork.SaveChangesAsync(ct);

        return new StandupSettingsDto(settings.ProjectId, settings.IsEnabled, settings.ScheduledTime.ToString("HH:mm"));
    }
}
