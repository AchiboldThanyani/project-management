using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities;

public class TeamMember : BaseEntity
{
    public Guid TeamId { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public TeamRole Role { get; private set; }

    public Team Team { get; set; } = null!;

    private TeamMember() { }

    public static TeamMember Create(Guid teamId, string userId, TeamRole role)
    {
        return new TeamMember { TeamId = teamId, UserId = userId, Role = role };
    }

    public void UpdateRole(TeamRole role)
    {
        Role = role;
        SetUpdated();
    }
}
