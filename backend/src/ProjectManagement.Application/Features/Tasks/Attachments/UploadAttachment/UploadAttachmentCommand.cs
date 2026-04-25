using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.Attachments.UploadAttachment;

public sealed record UploadAttachmentCommand(
    Guid TaskId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long SizeBytes) : IRequest<Result<TaskAttachmentDto>>;
