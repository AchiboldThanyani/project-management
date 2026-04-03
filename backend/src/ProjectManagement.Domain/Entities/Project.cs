using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities;

public class Project : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public ProjectStatus Status { get; private set; } = ProjectStatus.Planning;
    public DateTime? StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public Guid? TeamId { get; private set; }
    public string OwnerId { get; private set; } = string.Empty;

    public Team? Team { get; set; }
    public ICollection<Sprint> Sprints { get; set; } = [];
    public ICollection<ProjectTask> Tasks { get; set; } = [];
    public ICollection<ProjectMember> Members { get; set; } = [];

    private Project() { }

    public static Project Create(string name, string ownerId, string? description = null,
        Guid? teamId = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        return new Project
        {
            Name = name,
            OwnerId = ownerId,
            Description = description,
            TeamId = teamId,
            StartDate = AsUtc(startDate),
            EndDate = AsUtc(endDate)
        };
    }

    public void Update(string name, string? description, ProjectStatus status,
        DateTime? startDate, DateTime? endDate)
    {
        Name = name;
        Description = description;
        Status = status;
        StartDate = AsUtc(startDate);
        EndDate = AsUtc(endDate);
        SetUpdated();
    }
}
