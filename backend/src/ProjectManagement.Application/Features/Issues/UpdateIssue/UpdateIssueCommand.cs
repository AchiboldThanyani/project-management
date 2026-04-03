using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Issues.UpdateIssue;

public sealed record UpdateIssueCommand(
    Guid IssueId,
    string Title,
    string? Description,
    IssueType Type,
    TaskPriority Priority,
    string? AssigneeId) : ICommand<IssueDto>;
