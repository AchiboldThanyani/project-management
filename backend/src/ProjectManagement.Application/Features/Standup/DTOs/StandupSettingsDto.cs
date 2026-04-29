namespace ProjectManagement.Application.Features.Standup.DTOs;

public sealed record StandupSettingsDto(Guid ProjectId, bool IsEnabled, string ScheduledTime);
