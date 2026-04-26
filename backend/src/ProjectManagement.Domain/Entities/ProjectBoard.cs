using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class ProjectBoard : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public string Title { get; private set; } = string.Empty;
    public string ContentJson { get; private set; } = string.Empty;
    public string CreatedById { get; private set; } = string.Empty;

    private ProjectBoard() { }

    public static ProjectBoard Create(string title, Guid projectId, string createdById)
    {
        return new ProjectBoard
        {
            Title = title,
            ProjectId = projectId,
            CreatedById = createdById
        };
    }

    public void UpdateTitle(string title)
    {
        Title = title;
        SetUpdated();
    }

    public void UpdateContent(string contentJson)
    {
        ContentJson = contentJson;
        SetUpdated();
    }
}
