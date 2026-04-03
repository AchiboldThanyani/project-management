using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;

namespace ProjectManagement.Application.Features.Issues.AddIssueComment;

public sealed record AddIssueCommentCommand(
    Guid IssueId,
    string Content,
    string AuthorId) : ICommand<IssueCommentDto>;
