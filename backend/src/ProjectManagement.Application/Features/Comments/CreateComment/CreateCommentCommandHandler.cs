using System.Text.RegularExpressions;
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
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateCommentCommand, Result<CommentDto>>
{
    private static readonly Regex MentionRegex =
        new(@"@\[([^\]]+)\]\(([a-zA-Z0-9\-]+)\)", RegexOptions.Compiled);

    internal static HashSet<string> ExtractMentionedUserIds(string content)
    {
        var ids = new HashSet<string>();
        foreach (Match m in MentionRegex.Matches(content))
            ids.Add(m.Groups[2].Value);
        return ids;
    }

    public async Task<Result<CommentDto>> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        var task = await taskRepository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Error.NotFound("Task.NotFound", $"Task {request.TaskId} was not found.");

        var comment = Comment.Create(request.Content, request.TaskId, request.AuthorId);
        await repository.AddAsync(comment, cancellationToken);

        // Collect recipients: assignee + prior comment authors, deduped, excluding the new commenter
        var recipients = new HashSet<string>();

        if (task.AssigneeId is not null && task.AssigneeId != request.AuthorId)
            recipients.Add(task.AssigneeId);

        var priorComments = await repository.FindAsync(
            c => c.TaskId == request.TaskId, cancellationToken);
        foreach (var c in priorComments)
        {
            if (c.AuthorId != request.AuthorId)
                recipients.Add(c.AuthorId);
        }

        // Stage all notification entities
        foreach (var recipientId in recipients)
        {
            var n = Notification.Create(
                userId: recipientId,
                title: "New comment",
                body: $"New comment on \"{task.Title}\"",
                type: NotificationType.CommentAdded,
                relatedEntityId: task.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
        }

        // Collect Mentioned recipients: users tagged via @[Name](id) syntax, excluding commenter
        var mentionedIds = ExtractMentionedUserIds(request.Content);
        mentionedIds.Remove(request.AuthorId);

        // Stage Mentioned notifications
        foreach (var mentionedId in mentionedIds)
        {
            var n = Notification.Create(
                userId: mentionedId,
                title: "You were mentioned",
                body: $"You were mentioned in a comment on \"{task.Title}\"",
                type: NotificationType.Mentioned,
                relatedEntityId: task.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
        }

        // Commit comment + all notifications atomically
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Fire real-time pushes after DB rows exist
        foreach (var recipientId in recipients)
        {
            await notificationService.NotifyUser(
                recipientId, "New comment",
                $"New comment on \"{task.Title}\"",
                NotificationType.CommentAdded, task.Id, cancellationToken);
        }

        // Fire real-time pushes for mentions
        foreach (var mentionedId in mentionedIds)
        {
            await notificationService.NotifyUser(
                mentionedId, "You were mentioned",
                $"You were mentioned in a comment on \"{task.Title}\"",
                NotificationType.Mentioned, task.Id, cancellationToken);
        }

        return mapper.Map<CommentDto>(comment);
    }
}
