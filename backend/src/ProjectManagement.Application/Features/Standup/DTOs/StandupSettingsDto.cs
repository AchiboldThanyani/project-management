namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupSettingsDto(Guid ProjectId, bool IsEnabled, string ScheduledTime);
