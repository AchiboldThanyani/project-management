using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class VaultFile : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public Guid? FolderId { get; private set; }
    public VaultFolder? Folder { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string StoredFileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string UploadedById { get; private set; } = string.Empty;
    public string UploadedByName { get; private set; } = string.Empty;

    private VaultFile() { }

    public static VaultFile Create(
        Guid projectId, Guid? folderId,
        string fileName, string storedFileName,
        string contentType, long sizeBytes,
        string uploadedById, string uploadedByName)
    {
        if (sizeBytes <= 0) throw new ArgumentOutOfRangeException(nameof(sizeBytes), "SizeBytes must be positive.");
        return new()
        {
            ProjectId = projectId, FolderId = folderId,
            FileName = fileName, StoredFileName = storedFileName,
            ContentType = contentType, SizeBytes = sizeBytes,
            UploadedById = uploadedById, UploadedByName = uploadedByName
        };
    }

    public void Move(Guid? folderId) { FolderId = folderId; SetUpdated(); }
}
