using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GetStandupReports;

public sealed record GetStandupReportsQuery(Guid ProjectId) : IQuery<List<StandupReportSummaryDto>>;
