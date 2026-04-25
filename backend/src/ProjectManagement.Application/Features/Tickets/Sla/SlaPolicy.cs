using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tickets.Sla;

public enum SlaStatus { OnTime = 0, AtRisk = 1, Breached = 2 }

public static class SlaPolicy
{
    // (responseHours, resolutionHours) per priority
    private static readonly Dictionary<TaskPriority, (double Response, double Resolution)> Policy = new()
    {
        [TaskPriority.Critical] = (1,   4),
        [TaskPriority.High]     = (4,   24),
        [TaskPriority.Medium]   = (8,   72),
        [TaskPriority.Low]      = (24,  168),
    };

    public static (SlaStatus Status, DateTime ResponseDeadline, DateTime ResolutionDeadline, double HoursRemaining)
        Compute(TaskPriority priority, DateTime createdAt)
    {
        var (responseH, resolutionH) = Policy.GetValueOrDefault(priority, (24, 168));
        var responseDeadline    = createdAt.AddHours(responseH);
        var resolutionDeadline  = createdAt.AddHours(resolutionH);
        var now                 = DateTime.UtcNow;
        var hoursRemaining      = (resolutionDeadline - now).TotalHours;
        var atRiskThreshold     = resolutionH * 0.20;

        SlaStatus status;
        if (now > resolutionDeadline)
            status = SlaStatus.Breached;
        else if (hoursRemaining <= atRiskThreshold)
            status = SlaStatus.AtRisk;
        else
            status = SlaStatus.OnTime;

        return (status, responseDeadline, resolutionDeadline, hoursRemaining);
    }
}
