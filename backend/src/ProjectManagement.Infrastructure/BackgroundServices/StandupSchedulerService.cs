using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Infrastructure.BackgroundServices;

public class StandupSchedulerService(
    IServiceScopeFactory scopeFactory,
    ILogger<StandupSchedulerService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(1), ct);
            try { await RunScheduledStandupsAsync(ct); }
            catch (Exception ex) { logger.LogError(ex, "Standup scheduler error"); }
        }
    }

    private async Task RunScheduledStandupsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var settingsRepo = scope.ServiceProvider.GetRequiredService<IStandupSettingsRepository>();
        var generator = scope.ServiceProvider.GetRequiredService<IStandupGeneratorService>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var now = DateTime.UtcNow;
        var currentTime = TimeOnly.FromDateTime(now);
        var today = DateOnly.FromDateTime(now);

        var allEnabled = await settingsRepo.GetEnabledAsync(ct);
        foreach (var settings in allEnabled)
        {
            if (!ShouldRun(settings, currentTime, today)) continue;
            try
            {
                await generator.GenerateAsync(settings.ProjectId, isScheduled: true, generatedById: null, ct);
                settings.MarkRun();
                await unitOfWork.SaveChangesAsync(ct);
                logger.LogInformation("Standup generated for project {ProjectId}", settings.ProjectId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to generate standup for project {ProjectId}", settings.ProjectId);
            }
        }
    }

    internal static bool ShouldRun(StandupSettings settings, TimeOnly currentTime, DateOnly today)
    {
        if (!settings.IsEnabled) return false;
        var minuteDiff = Math.Abs((settings.ScheduledTime - currentTime).TotalMinutes);
        if (minuteDiff >= 1) return false;
        if (settings.LastRunAt == null) return true;
        return DateOnly.FromDateTime(settings.LastRunAt.Value) < today;
    }
}
