namespace ProjectManagement.Application.Features.Tasks.Attachments;

public record TaskAttachmentDto
{
    public Guid Id { get; init; }
    public Guid TaskId { get; init; }
    public string FileName { get; init; } = default!;
    public string ContentType { get; init; } = default!;
    public long SizeBytes { get; init; }
    public string UploadedById { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
