using System.Text.Json;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Standup.GenerateStandup;

internal sealed class GenerateStandupCommandHandler(
    IStandupGeneratorService generator,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<GenerateStandupCommand, Result<StandupReportDto>>
{
    public async Task<Result<StandupReportDto>> Handle(GenerateStandupCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Standup.Forbidden", "Only project managers can generate standup reports.");

        var report = await generator.GenerateAsync(request.ProjectId, isScheduled: false, currentUser.UserId, ct);
        List<StandupMemberSummaryDto> members;
        try { members = JsonSerializer.Deserialize<List<StandupMemberSummaryDto>>(report.ReportJson) ?? []; }
        catch (JsonException) { members = []; }

        return new StandupReportDto(report.Id, report.ProjectId, report.GeneratedAt, report.IsScheduled, report.GeneratedById, members);
    }
}
