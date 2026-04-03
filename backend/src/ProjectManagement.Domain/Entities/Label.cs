using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class Label : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Color { get; private set; } = "blue"; // maps to design token: violet|blue|teal|emerald|amber|rose|soft
    public Guid ProjectId { get; private set; }

    public ICollection<ProjectTask> Tasks { get; set; } = [];

    private Label() { }

    public static Label Create(string name, string color, Guid projectId) =>
        new() { Name = name, Color = color, ProjectId = projectId };

    public void Update(string name, string color)
    {
        Name = name;
        Color = color;
        SetUpdated();
    }
}
