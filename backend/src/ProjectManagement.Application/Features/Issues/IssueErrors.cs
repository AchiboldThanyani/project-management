using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Issues;

public static class IssueErrors
{
    public static Error NotFound(Guid id) => new("Issue.NotFound", $"Issue {id} was not found.", ErrorType.NotFound);
    public static Error CommentNotFound(Guid id) => new("IssueComment.NotFound", $"Comment {id} was not found.", ErrorType.NotFound);
    public static Error AlreadyConverted => new("Issue.AlreadyConverted", "This issue has already been converted to a task.", ErrorType.Conflict);
}
