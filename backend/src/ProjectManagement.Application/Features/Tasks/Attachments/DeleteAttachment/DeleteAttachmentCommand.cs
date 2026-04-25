using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.Attachments.DeleteAttachment;

public sealed record DeleteAttachmentCommand(Guid AttachmentId) : IRequest<Result>;
