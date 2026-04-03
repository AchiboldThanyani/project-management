using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class TeamMessage : BaseEntity
{
    public Guid TeamId { get; private set; }
    public string AuthorId { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;

    public Team Team { get; set; } = null!;

    private TeamMessage() { }

    public static TeamMessage Create(Guid teamId, string authorId, string content)
    {
        return new TeamMessage { TeamId = teamId, AuthorId = authorId, Content = content };
    }
}
