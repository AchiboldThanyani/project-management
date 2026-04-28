using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Issues.CloseIssue;

internal sealed class CloseIssueCommandHandler(
    IIssueRepository issueRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<CloseIssueCommand, Result<IssueDto>>
{
    public async Task<Result<IssueDto>> Handle(CloseIssueCommand request, CancellationToken cancellationToken)
    {
        var issue = await issueRepository.GetByIdAsync(request.IssueId, cancellationToken);
        if (issue is null) return IssueErrors.NotFound(request.IssueId);

        issue.Close();

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"closed issue \"{issue.Title}\"", "Issue", issue.Id, issue.Title,
            projectId: issue.ProjectId);
        await activityRepository.AddAsync(log, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await issueRepository.GetDtoByIdAsync(request.IssueId, cancellationToken)
               ?? new IssueDto { Id = issue.Id, Number = issue.Number, Title = issue.Title };
    }
}
