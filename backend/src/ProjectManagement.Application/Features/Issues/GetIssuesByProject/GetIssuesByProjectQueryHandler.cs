using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Issues.GetIssuesByProject;

internal sealed class GetIssuesByProjectQueryHandler(IIssueRepository issueRepository)
    : IRequestHandler<GetIssuesByProjectQuery, Result<PagedResult<IssueDto>>>
{
    public async Task<Result<PagedResult<IssueDto>>> Handle(GetIssuesByProjectQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await issueRepository.GetPagedByProjectAsync(
            request.ProjectId, request.Status, request.Type, request.Page, request.PageSize, cancellationToken);

        return new PagedResult<IssueDto>(items, totalCount, request.Page, request.PageSize);
    }
}
