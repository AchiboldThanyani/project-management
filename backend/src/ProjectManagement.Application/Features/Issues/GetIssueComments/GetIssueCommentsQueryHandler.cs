using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Issues.GetIssueComments;

internal sealed class GetIssueCommentsQueryHandler(IIssueRepository issueRepository)
    : IRequestHandler<GetIssueCommentsQuery, Result<IReadOnlyList<IssueCommentDto>>>
{
    public async Task<Result<IReadOnlyList<IssueCommentDto>>> Handle(GetIssueCommentsQuery request, CancellationToken cancellationToken)
    {
        var comments = await issueRepository.GetCommentsAsync(request.IssueId, cancellationToken);
        return Result<IReadOnlyList<IssueCommentDto>>.Success(comments);
    }
}
