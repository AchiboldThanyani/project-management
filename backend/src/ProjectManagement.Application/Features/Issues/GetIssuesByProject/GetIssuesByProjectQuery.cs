using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Issues.GetIssuesByProject;

public sealed record GetIssuesByProjectQuery(
    Guid ProjectId,
    IssueStatus? Status = null,
    IssueType? Type = null,
    int Page = 1,
    int PageSize = 50) : IQuery<PagedResult<IssueDto>>;
