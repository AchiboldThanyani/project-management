using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Issues.UpdateIssue;

internal sealed class UpdateIssueCommandHandler(
    IIssueRepository issueRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateIssueCommand, Result<IssueDto>>
{
    public async Task<Result<IssueDto>> Handle(UpdateIssueCommand request, CancellationToken cancellationToken)
    {
        var issue = await issueRepository.GetByIdAsync(request.IssueId, cancellationToken);
        if (issue is null) return IssueErrors.NotFound(request.IssueId);

        issue.Update(request.Title, request.Description, request.Type, request.Priority, request.AssigneeId);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await issueRepository.GetDtoByIdAsync(request.IssueId, cancellationToken)
               ?? new IssueDto { Id = issue.Id, Number = issue.Number, Title = issue.Title };
    }
}
