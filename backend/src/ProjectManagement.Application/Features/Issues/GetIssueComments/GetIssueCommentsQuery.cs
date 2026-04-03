using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;

namespace ProjectManagement.Application.Features.Issues.GetIssueComments;

public sealed record GetIssueCommentsQuery(Guid IssueId) : IQuery<IReadOnlyList<IssueCommentDto>>;
