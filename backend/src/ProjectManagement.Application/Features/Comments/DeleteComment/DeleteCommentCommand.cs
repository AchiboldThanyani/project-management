using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Comments.DeleteComment;

public sealed record DeleteCommentCommand(Guid CommentId, string RequestingUserId) : ICommand;
