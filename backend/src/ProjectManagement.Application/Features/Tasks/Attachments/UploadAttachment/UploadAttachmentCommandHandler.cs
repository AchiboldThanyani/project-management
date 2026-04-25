using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.Attachments.UploadAttachment;

internal sealed class UploadAttachmentCommandHandler(
    ITaskRepository tasks,
    ITaskAttachmentRepository attachments,
    ICurrentUserService currentUser,
    IFileStorageService fileStorage,
    IUnitOfWork unitOfWork)
    : IRequestHandler<UploadAttachmentCommand, Result<TaskAttachmentDto>>
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv",
        "text/markdown", "text/x-markdown",
        "application/zip",
    ];

    private const long MaxBytes = 20 * 1024 * 1024;

    public async Task<Result<TaskAttachmentDto>> Handle(UploadAttachmentCommand req, CancellationToken ct)
    {
        var task = await tasks.GetByIdAsync(req.TaskId, ct);
        if (task is null)
            return Error.NotFound("Task.NotFound", "Task not found.");

        if (req.SizeBytes == 0)
            return Error.Validation("Attachment.Empty", "File is empty.");
        if (req.SizeBytes > MaxBytes)
            return Error.Validation("Attachment.TooLarge", "File exceeds the 20 MB limit.");
        if (!AllowedTypes.Contains(req.ContentType))
            return Error.Validation("Attachment.InvalidType", "File type is not allowed.");

        var ext = Path.GetExtension(req.FileName);
        var storedName = await fileStorage.SaveAsync(req.FileStream, ext, ct);

        var attachment = TaskAttachment.Create(req.TaskId, req.FileName, storedName, req.ContentType, req.SizeBytes, currentUser.UserId);
        await attachments.AddAsync(attachment, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return new TaskAttachmentDto
        {
            Id = attachment.Id,
            TaskId = attachment.TaskId,
            FileName = attachment.FileName,
            ContentType = attachment.ContentType,
            SizeBytes = attachment.SizeBytes,
            UploadedById = attachment.UploadedById,
            CreatedAt = attachment.CreatedAt,
        };
    }
}
