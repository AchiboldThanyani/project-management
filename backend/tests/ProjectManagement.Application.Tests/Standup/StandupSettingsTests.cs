using ProjectManagement.Domain.Entities;
using Xunit;

namespace ProjectManagement.Application.Tests.Standup;

public class StandupSettingsTests
{
    [Fact]
    public void Create_SetsDefaultValues()
    {
        var projectId = Guid.NewGuid();
        var settings = StandupSettings.Create(projectId);

        Assert.Equal(projectId, settings.ProjectId);
        Assert.False(settings.IsEnabled);
        Assert.Equal(new TimeOnly(8, 0), settings.ScheduledTime);
        Assert.Null(settings.LastRunAt);
    }

    [Fact]
    public void Update_ChangesEnabledAndTime()
    {
        var settings = StandupSettings.Create(Guid.NewGuid());
        var newTime = new TimeOnly(9, 30);

        settings.Update(isEnabled: true, scheduledTime: newTime);

        Assert.True(settings.IsEnabled);
        Assert.Equal(newTime, settings.ScheduledTime);
    }

    [Fact]
    public void MarkRun_SetsLastRunAt()
    {
        var settings = StandupSettings.Create(Guid.NewGuid());
        var before = DateTime.UtcNow;

        settings.MarkRun();

        Assert.NotNull(settings.LastRunAt);
        Assert.True(settings.LastRunAt >= before);
    }

    [Fact]
    public void MarkRun_WhenCalledTwice_LastRunAtRemainsSet()
    {
        var settings = StandupSettings.Create(Guid.NewGuid());
        settings.MarkRun();

        settings.MarkRun();

        // Verifies repeated calls do not reset LastRunAt to null
        Assert.NotNull(settings.LastRunAt);
        Assert.True(settings.LastRunAt >= DateTime.UtcNow.AddSeconds(-5));
    }
}
