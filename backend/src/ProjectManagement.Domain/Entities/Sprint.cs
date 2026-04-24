using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class Sprint : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Goal { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsCompleted { get; private set; }
    public string? RetroNotes { get; private set; }
    public Guid ProjectId { get; private set; }

    public Project Project { get; set; } = null!;
    public ICollection<ProjectTask> Tasks { get; set; } = [];

    private Sprint() { }

    public static Sprint Create(string name, Guid projectId, DateTime startDate, DateTime endDate, string? goal = null)
    {
        return new Sprint
        {
            Name = name,
            ProjectId = projectId,
            StartDate = AsUtc(startDate),
            EndDate = AsUtc(endDate),
            Goal = goal
        };
    }

    public void Update(string name, string? goal, DateTime startDate, DateTime endDate)
    {
        Name = name;
        Goal = goal;
        StartDate = AsUtc(startDate);
        EndDate = AsUtc(endDate);
        SetUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        SetUpdated();
    }

    public void Complete(string? retroNotes = null)
    {
        IsActive = false;
        IsCompleted = true;
        RetroNotes = retroNotes;
        SetUpdated();
    }
}
