using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Issues.CreateIssue;

internal sealed class CreateIssueCommandHandler(
    IIssueRepository issueRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<CreateIssueCommand, Result<IssueDto>>
{
    public async Task<Result<IssueDto>> Handle(CreateIssueCommand request, CancellationToken cancellationToken)
    {
        var nextNumber = await issueRepository.GetNextNumberAsync(request.ProjectId, cancellationToken);

        var issue = Issue.Create(
            nextNumber,
            request.Title,
            request.ProjectId,
            request.ReporterId,
            request.Description,
            request.Type,
            request.Priority,
            request.AssigneeId);

        await issueRepository.AddAsync(issue, cancellationToken);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"opened issue \"{request.Title}\"", "Issue", issue.Id, request.Title);
        await activityRepository.AddAsync(log, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await issueRepository.GetDtoByIdAsync(issue.Id, cancellationToken)
               ?? new IssueDto { Id = issue.Id, Number = issue.Number, Title = issue.Title };
    }
}
