namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupReportDto(
    Guid Id,
    Guid ProjectId,
    DateTime GeneratedAt,
    bool IsScheduled,
    string? GeneratedById,
    List<StandupMemberSummaryDto> Members);
