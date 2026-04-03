using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities;

public class ProjectMember : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public ProjectMemberRole Role { get; private set; }

    public Project Project { get; set; } = null!;

    private ProjectMember() { }

    public static ProjectMember Create(Guid projectId, string userId, ProjectMemberRole role) =>
        new() { ProjectId = projectId, UserId = userId, Role = role };

    public void UpdateRole(ProjectMemberRole role)
    {
        Role = role;
        SetUpdated();
    }
}
