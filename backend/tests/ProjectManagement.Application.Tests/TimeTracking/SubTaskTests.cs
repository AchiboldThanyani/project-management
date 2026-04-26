using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Tests.TimeTracking;

public class SubTaskTests
{
    [Fact]
    public void SetEstimatedHours_SetsValue()
    {
        var st = SubTask.Create(Guid.NewGuid(), "Fix login");
        st.SetEstimatedHours(3.5m);
        Assert.Equal(3.5m, st.EstimatedHours);
    }

    [Fact]
    public void SetEstimatedHours_AcceptsNull()
    {
        var st = SubTask.Create(Guid.NewGuid(), "Fix login");
        st.SetEstimatedHours(3m);
        st.SetEstimatedHours(null);
        Assert.Null(st.EstimatedHours);
    }
}
