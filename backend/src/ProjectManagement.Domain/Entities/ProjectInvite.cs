using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class ProjectInvite : BaseEntity
{
    public Guid   ProjectId       { get; private set; }
    public string Token           { get; private set; } = string.Empty;
    public string CreatedByUserId { get; private set; } = string.Empty;
    public DateTime ExpiresAt     { get; private set; }
    public bool   IsRevoked       { get; private set; }

    public Project Project { get; set; } = null!;

    private ProjectInvite() { }

    public static ProjectInvite Create(Guid projectId, string createdByUserId, int validDays = 30) =>
        new()
        {
            ProjectId       = projectId,
            Token           = Guid.NewGuid().ToString("N"),
            CreatedByUserId = createdByUserId,
            ExpiresAt       = DateTime.UtcNow.AddDays(validDays),
        };

    public bool IsValid() => !IsRevoked && ExpiresAt > DateTime.UtcNow;
    public void Revoke() { IsRevoked = true; SetUpdated(); }
}
