using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class VaultFolder : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public string Name { get; private set; } = string.Empty;
    public string CreatedById { get; private set; } = string.Empty;

    private VaultFolder() { }

    public static VaultFolder Create(string name, Guid projectId, string createdById) =>
        new() { Name = name, ProjectId = projectId, CreatedById = createdById };

    public void Rename(string name) { Name = name; SetUpdated(); }
}
