using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class Comment : BaseEntity
{
    public string Content { get; private set; } = string.Empty;
    public Guid TaskId { get; private set; }
    public string AuthorId { get; private set; } = string.Empty;

    public ProjectTask Task { get; set; } = null!;

    private Comment() { }

    public static Comment Create(string content, Guid taskId, string authorId)
    {
        return new Comment { Content = content, TaskId = taskId, AuthorId = authorId };
    }

    public void Edit(string content)
    {
        Content = content;
        SetUpdated();
    }
}
