using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.BackgroundServices;
using Xunit;

namespace ProjectManagement.Application.Tests.Standup;

public class StandupSchedulerTests
{
    private static StandupSettings EnabledAt(TimeOnly time)
    {
        var s = StandupSettings.Create(Guid.NewGuid());
        s.Update(isEnabled: true, scheduledTime: time);
        return s;
    }

    [Fact]
    public void ShouldRun_WhenEnabledAndTimeMatchesAndNotRunToday_ReturnsTrue()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), today);

        Assert.True(result);
    }

    [Fact]
    public void ShouldRun_WhenDisabled_ReturnsFalse()
    {
        var settings = StandupSettings.Create(Guid.NewGuid()); // IsEnabled = false
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), today);

        Assert.False(result);
    }

    [Fact]
    public void ShouldRun_WhenAlreadyRanToday_ReturnsFalse()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        settings.MarkRun();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), today);

        Assert.False(result);
    }

    [Fact]
    public void ShouldRun_WhenTimeDiffMoreThanOneMinute_ReturnsFalse()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 2), today);

        Assert.False(result);
    }

    [Fact]
    public void ShouldRun_WhenRanYesterday_ReturnsTrue()
    {
        var settings = EnabledAt(new TimeOnly(8, 0));
        settings.MarkRun();
        // Simulate LastRunAt being yesterday by checking with tomorrow's date
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        var result = StandupSchedulerService.ShouldRun(settings, new TimeOnly(8, 0), tomorrow);

        Assert.True(result);
    }
}
