using MediatR;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.Attachments;

public sealed record GetAttachmentDownloadQuery(Guid AttachmentId) : IRequest<AttachmentDownload?>;

public sealed record AttachmentDownload(string FullPath, string ContentType, string FileName);

internal sealed class GetAttachmentDownloadQueryHandler(
    ITaskAttachmentRepository attachments,
    IFileStorageService fileStorage)
    : IRequestHandler<GetAttachmentDownloadQuery, AttachmentDownload?>
{
    public async Task<AttachmentDownload?> Handle(GetAttachmentDownloadQuery req, CancellationToken ct)
    {
        var attachment = await attachments.GetByIdAsync(req.AttachmentId, ct);
        if (attachment is null) return null;

        var fullPath = fileStorage.GetFullPath(attachment.StoredFileName);
        return File.Exists(fullPath)
            ? new AttachmentDownload(fullPath, attachment.ContentType, attachment.FileName)
            : null;
    }
}
