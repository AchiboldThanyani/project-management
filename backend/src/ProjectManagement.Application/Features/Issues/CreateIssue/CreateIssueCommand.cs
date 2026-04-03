using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Issues.CreateIssue;

public sealed record CreateIssueCommand(
    string Title,
    string? Description,
    IssueType Type,
    TaskPriority Priority,
    Guid ProjectId,
    string? AssigneeId,
    string ReporterId) : ICommand<IssueDto>;
