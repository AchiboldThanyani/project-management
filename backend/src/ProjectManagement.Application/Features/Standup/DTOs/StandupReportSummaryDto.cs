namespace ProjectManagement.Application.Features.Standup.DTOs;

public sealed record StandupReportSummaryDto(Guid Id, DateTime GeneratedAt, bool IsScheduled);
