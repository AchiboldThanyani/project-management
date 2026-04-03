using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;

namespace ProjectManagement.Application.Features.Issues.GetIssueById;

public sealed record GetIssueByIdQuery(Guid IssueId) : IQuery<IssueDto>;
