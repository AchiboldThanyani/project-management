using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.Attachments.DeleteAttachment;

internal sealed class DeleteAttachmentCommandHandler(
    ITaskAttachmentRepository attachments,
    IFileStorageService fileStorage,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteAttachmentCommand, Result>
{
    public async Task<Result> Handle(DeleteAttachmentCommand req, CancellationToken ct)
    {
        var attachment = await attachments.GetByIdAsync(req.AttachmentId, ct);
        if (attachment is null)
            return Error.NotFound("Attachment.NotFound", "Attachment not found.");

        fileStorage.Delete(attachment.StoredFileName);
        attachments.Remove(attachment);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}
