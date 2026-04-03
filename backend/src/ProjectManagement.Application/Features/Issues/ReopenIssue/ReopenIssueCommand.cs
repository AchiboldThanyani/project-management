using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;

namespace ProjectManagement.Application.Features.Issues.ReopenIssue;

public sealed record ReopenIssueCommand(Guid IssueId) : ICommand<IssueDto>;
