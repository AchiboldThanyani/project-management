using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class VaultDocument : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public Guid? FolderId { get; private set; }
    public VaultFolder? Folder { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string ContentJson { get; private set; } = string.Empty;
    public string CreatedById { get; private set; } = string.Empty;
    public string CreatedByName { get; private set; } = string.Empty;
    public string? UpdatedById { get; private set; }
    public string? UpdatedByName { get; private set; }

    private VaultDocument() { }

    public static VaultDocument Create(
        string title, Guid projectId, Guid? folderId,
        string createdById, string createdByName) =>
        new()
        {
            Title = title, ProjectId = projectId, FolderId = folderId,
            ContentJson = string.Empty,
            CreatedById = createdById, CreatedByName = createdByName
        };

    public void Update(string title, string contentJson, string updatedById, string updatedByName)
    {
        Title = title; ContentJson = contentJson;
        UpdatedById = updatedById; UpdatedByName = updatedByName;
        SetUpdated();
    }

    public void Move(Guid? folderId) { FolderId = folderId; SetUpdated(); }
}
