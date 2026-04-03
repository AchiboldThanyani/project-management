using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class Team : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    public ICollection<TeamMember> Members { get; set; } = [];
    public ICollection<Project> Projects { get; set; } = [];

    private Team() { }

    public static Team Create(string name, string? description = null)
    {
        return new Team { Name = name, Description = description };
    }

    public void Update(string name, string? description)
    {
        Name = name;
        Description = description;
        SetUpdated();
    }
}
