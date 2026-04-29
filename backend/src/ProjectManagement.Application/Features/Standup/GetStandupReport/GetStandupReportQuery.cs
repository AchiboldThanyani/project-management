using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GetStandupReport;

public sealed record GetStandupReportQuery(Guid ProjectId, Guid ReportId) : IQuery<StandupReportDto>;
