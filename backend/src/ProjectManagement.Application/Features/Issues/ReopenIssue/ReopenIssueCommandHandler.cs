using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Issues.ReopenIssue;

internal sealed class ReopenIssueCommandHandler(
    IIssueRepository issueRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<ReopenIssueCommand, Result<IssueDto>>
{
    public async Task<Result<IssueDto>> Handle(ReopenIssueCommand request, CancellationToken cancellationToken)
    {
        var issue = await issueRepository.GetByIdAsync(request.IssueId, cancellationToken);
        if (issue is null) return IssueErrors.NotFound(request.IssueId);

        issue.Reopen();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await issueRepository.GetDtoByIdAsync(request.IssueId, cancellationToken)
               ?? new IssueDto { Id = issue.Id, Number = issue.Number, Title = issue.Title };
    }
}
