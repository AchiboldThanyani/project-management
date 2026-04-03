using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;

namespace ProjectManagement.Application.Features.Issues.CloseIssue;

public sealed record CloseIssueCommand(Guid IssueId) : ICommand<IssueDto>;
