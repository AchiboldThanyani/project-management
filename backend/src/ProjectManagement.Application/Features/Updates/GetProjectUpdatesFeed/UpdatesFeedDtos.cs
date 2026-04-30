namespace ProjectManagement.Application.Features.Updates.GetProjectUpdatesFeed;

public record UpdatesFeedDayDto(
    DateOnly Date,
    IReadOnlyList<UpdatesFeedMemberDto> Members);

public record UpdatesFeedMemberDto(
    string UserId,
    string Name,
    IReadOnlyList<UpdatesTimeLogDto> TimeLogs,
    IReadOnlyList<UpdatesActivityDto> Activity);

public record UpdatesTimeLogDto(
    string TaskTitle,
    decimal Hours,
    string? Description);

public record UpdatesActivityDto(
    string Action,
    string EntityType,
    string EntityName,
    DateTime CreatedAt);
