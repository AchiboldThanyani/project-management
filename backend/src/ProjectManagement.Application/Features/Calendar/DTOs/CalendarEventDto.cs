namespace ProjectManagement.Application.Features.Calendar.DTOs;

public sealed record CalendarEventDto(
    Guid Id,
    string Type,
    string Title,
    DateTime Start,
    DateTime End,
    Guid ProjectId,
    string ProjectName,
    string Color,
    string? Priority,
    bool IsCompleted
);
