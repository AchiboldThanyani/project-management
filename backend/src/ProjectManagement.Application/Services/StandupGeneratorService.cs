using System.Text;
using System.Text.Json;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Services;

public class StandupGeneratorService(
    IProjectMemberRepository memberRepo,
    IActivityRepository activityRepo,
    ITimeLogRepository timeLogRepo,
    IStandupReportRepository reportRepo,
    IUnitOfWork unitOfWork) : IStandupGeneratorService
{
    public async Task<StandupReport> GenerateAsync(
        Guid projectId, bool isScheduled, string? generatedById, CancellationToken ct = default)
    {
        var members = await memberRepo.GetByProjectAsync(projectId, ct);
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var since = now.AddHours(-24);

        var summaries = new List<StandupMemberSummaryDto>();
        foreach (var member in members)
        {
            var activity = await activityRepo.GetByProjectAndUserAsync(projectId, member.UserId, since, ct);
            var timeLogs = await timeLogRepo.GetByProjectAndUserAsync(projectId, member.UserId, today, ct);

            var summary = activity.Count == 0 && timeLogs.Count == 0
                ? "No activity recorded."
                : BuildSummary(activity, timeLogs);

            summaries.Add(new StandupMemberSummaryDto(member.UserId, member.FullName, summary));
        }

        var reportJson = JsonSerializer.Serialize(summaries);
        var report = StandupReport.Create(projectId, isScheduled, generatedById, reportJson);
        await reportRepo.AddAsync(report, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return report;
    }

    private static string BuildSummary(
        IReadOnlyList<ActivityLog> activity,
        IReadOnlyList<TimeLog> timeLogs)
    {
        var sb = new StringBuilder();

        if (timeLogs.Count > 0)
        {
            sb.AppendLine("✅ Time logged:");
            foreach (var log in timeLogs)
            {
                var desc = string.IsNullOrWhiteSpace(log.Description) ? "" : $" – {log.Description}";
                sb.AppendLine($"   • {log.Task?.Title ?? "Unknown task"} ({log.Hours}h){desc}");
            }
        }

        if (activity.Count > 0)
        {
            if (sb.Length > 0) sb.AppendLine();
            sb.AppendLine("🔄 Activity (last 24h):");
            foreach (var a in activity.Take(10))
                sb.AppendLine($"   • {a.Action} {a.EntityType}: {a.EntityName}");
        }

        return sb.ToString().TrimEnd();
    }
}
