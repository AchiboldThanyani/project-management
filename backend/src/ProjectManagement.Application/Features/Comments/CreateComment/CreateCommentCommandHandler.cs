using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Comments.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Comments.CreateComment;

internal sealed class CreateCommentCommandHandler(
    ICommentRepository repository,
    ITaskRepository taskRepository,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateCommentCommand, Result<CommentDto>>
{
    public async Task<Result<CommentDto>> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = Comment.Create(request.Content, request.TaskId, request.AuthorId);
        await repository.AddAsync(comment, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Load task for assignee and project info
        var tasks = await taskRepository.FindAsync(t => t.Id == request.TaskId, cancellationToken);
        var task = tasks.FirstOrDefault();
        if (task is null)
            return mapper.Map<CommentDto>(comment);

        // Collect recipients: assignee + prior comment authors, deduped, excluding commenter
        var currentUserId = currentUser.UserId;
        var recipients = new HashSet<string>();

        if (task.AssigneeId is not null && task.AssigneeId != currentUserId)
            recipients.Add(task.AssigneeId);

        var priorComments = await repository.FindAsync(
            c => c.TaskId == request.TaskId && c.Id != comment.Id, cancellationToken);
        foreach (var c in priorComments)
        {
            if (c.AuthorId != currentUserId)
                recipients.Add(c.AuthorId);
        }

        foreach (var recipientId in recipients)
        {
            var n = Notification.Create(
                userId: recipientId,
                title: "New comment",
                body: $"New comment on \"{task.Title}\"",
                type: NotificationType.CommentAdded,
                relatedEntityId: task.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
            await notificationService.NotifyUser(
                recipientId, "New comment",
                $"New comment on \"{task.Title}\"",
                NotificationType.CommentAdded, task.Id, cancellationToken);
        }

        return mapper.Map<CommentDto>(comment);
    }
}
