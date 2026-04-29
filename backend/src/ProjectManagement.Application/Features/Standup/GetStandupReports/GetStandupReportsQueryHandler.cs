using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GetStandupReports;

internal sealed class GetStandupReportsQueryHandler(
    IStandupReportRepository reportRepo,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GetStandupReportsQuery, Result<List<StandupReportSummaryDto>>>
{
    public async Task<Result<List<StandupReportSummaryDto>>> Handle(GetStandupReportsQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Standup.Forbidden", "You do not have access to this project.");

        var reports = await reportRepo.GetByProjectAsync(request.ProjectId, count: 30, ct);
        return reports.Select(r => new StandupReportSummaryDto(r.Id, r.GeneratedAt, r.IsScheduled)).ToList();
    }
}
