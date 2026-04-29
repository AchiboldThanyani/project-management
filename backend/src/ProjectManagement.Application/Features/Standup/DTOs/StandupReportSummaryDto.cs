namespace ProjectManagement.Application.Features.Standup.DTOs;

public record StandupReportSummaryDto(Guid Id, DateTime GeneratedAt, bool IsScheduled);
