using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Tests.TimeTracking;

public class TimeLogTests
{
    [Fact]
    public void Update_ChangesHoursDescriptionAndDate()
    {
        var log = TimeLog.Create(Guid.NewGuid(), "user1", 2m, new DateOnly(2025, 1, 15));
        log.Update(5m, "updated desc", new DateOnly(2025, 1, 14));
        Assert.Equal(5m, log.Hours);
        Assert.Equal("updated desc", log.Description);
        Assert.Equal(new DateOnly(2025, 1, 14), log.LoggedDate);
    }

    [Fact]
    public void Create_WithSubTaskId_SetsSubTaskId()
    {
        var subTaskId = Guid.NewGuid();
        var log = TimeLog.Create(Guid.NewGuid(), "user1", 2m, new DateOnly(2025, 1, 15), subTaskId: subTaskId);
        Assert.Equal(subTaskId, log.SubTaskId);
    }

    [Fact]
    public void Create_WithoutSubTaskId_SubTaskIdIsNull()
    {
        var log = TimeLog.Create(Guid.NewGuid(), "user1", 2m, new DateOnly(2025, 1, 15));
        Assert.Null(log.SubTaskId);
    }
}
