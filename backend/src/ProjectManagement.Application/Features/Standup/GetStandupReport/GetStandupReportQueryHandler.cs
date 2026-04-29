using System.Text.Json;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GetStandupReport;

internal sealed class GetStandupReportQueryHandler(
    IStandupReportRepository reportRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GetStandupReportQuery, Result<StandupReportDto>>
{
    public async Task<Result<StandupReportDto>> Handle(GetStandupReportQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Standup.Forbidden", "You do not have access to this project.");

        var report = await reportRepo.GetByIdAsync(request.ReportId, ct);
        if (report == null || report.ProjectId != request.ProjectId)
            return Error.NotFound("Standup.ReportNotFound", "Report not found.");

        var members = JsonSerializer.Deserialize<List<StandupMemberSummaryDto>>(report.ReportJson) ?? [];
        return new StandupReportDto(report.Id, report.ProjectId, report.GeneratedAt, report.IsScheduled, report.GeneratedById, members);
    }
}
