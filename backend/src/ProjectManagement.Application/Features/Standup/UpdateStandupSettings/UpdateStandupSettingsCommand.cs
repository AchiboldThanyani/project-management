using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.UpdateStandupSettings;

public sealed record UpdateStandupSettingsCommand(
    Guid ProjectId,
    bool IsEnabled,
    string ScheduledTime) : ICommand<StandupSettingsDto>;
