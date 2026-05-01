using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class ProjectMessage : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public string AuthorId { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;

    public Project Project { get; set; } = null!;

    private ProjectMessage() { }

    public static ProjectMessage Create(Guid projectId, string authorId, string content)
        => new() { ProjectId = projectId, AuthorId = authorId, Content = content };
}
