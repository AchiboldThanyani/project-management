using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Comments;

public static class CommentErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Comment.NotFound", $"Comment with id '{id}' was not found.");

    public static readonly Error Forbidden =
        Error.Unauthorized("Comment.Forbidden", "You can only delete your own comments.");
}
