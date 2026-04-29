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
    IClaudeService claudeService,
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

            string summary;
            if (activity.Count == 0 && timeLogs.Count == 0)
            {
                summary = "No activity recorded.";
            }
            else
            {
                var prompt = BuildPrompt(member.FullName, activity, timeLogs);
                try
                {
                    summary = await claudeService.AskAsync(prompt, ct);
                }
                catch (Exception)
                {
                    summary = "Summary unavailable — generation error.";
                }
            }

            summaries.Add(new StandupMemberSummaryDto(member.UserId, member.FullName, summary));
        }

        var reportJson = JsonSerializer.Serialize(summaries);
        var report = StandupReport.Create(projectId, isScheduled, generatedById, reportJson);
        await reportRepo.AddAsync(report, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return report;
    }

    private static string BuildPrompt(
        string name,
        IReadOnlyList<ActivityLog> activity,
        IReadOnlyList<TimeLog> timeLogs)
    {
        var actData = activity.Select(a => new { a.Action, a.EntityType, a.EntityName });
        var timeData = timeLogs.Select(t => new { TaskName = t.Task?.Title ?? "Unknown task", t.Hours, t.Description });

        return $"""
            Write a concise standup update for {name} based on the following activity from the last 24 hours.

            Format your response exactly as:
            ✅ Yesterday: [what they completed or worked on]
            🔄 Today: [tasks currently In Progress or To Do]
            ⚠️ Blocked: [any task or issue in Blocked status — omit this line if none]

            Be brief. Use the task/issue names from the data. Do not invent information.

            Activity:
            {JsonSerializer.Serialize(actData)}

            Time logged:
            {JsonSerializer.Serialize(timeData)}
            """;
    }
}
