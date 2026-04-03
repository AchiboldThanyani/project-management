using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class IssueComment : BaseEntity
{
    public string Content { get; private set; } = string.Empty;
    public Guid IssueId { get; private set; }
    public string AuthorId { get; private set; } = string.Empty;

    public Issue Issue { get; set; } = null!;

    private IssueComment() { }

    public static IssueComment Create(Guid issueId, string authorId, string content)
        => new() { IssueId = issueId, AuthorId = authorId, Content = content };

    public void Update(string content)
    {
        Content = content;
        SetUpdated();
    }
}
