using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class TaskAttachment : BaseEntity
{
    public Guid TaskId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string StoredFileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string UploadedById { get; private set; } = string.Empty;

    public ProjectTask Task { get; set; } = null!;

    private TaskAttachment() { }

    public static TaskAttachment Create(Guid taskId, string fileName, string storedFileName,
        string contentType, long sizeBytes, string uploadedById) => new()
    {
        TaskId = taskId,
        FileName = fileName,
        StoredFileName = storedFileName,
        ContentType = contentType,
        SizeBytes = sizeBytes,
        UploadedById = uploadedById,
    };
}
