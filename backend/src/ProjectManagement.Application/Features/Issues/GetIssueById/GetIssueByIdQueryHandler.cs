using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Issues.GetIssueById;

internal sealed class GetIssueByIdQueryHandler(IIssueRepository issueRepository)
    : IRequestHandler<GetIssueByIdQuery, Result<IssueDto>>
{
    public async Task<Result<IssueDto>> Handle(GetIssueByIdQuery request, CancellationToken cancellationToken)
    {
        var dto = await issueRepository.GetDtoByIdAsync(request.IssueId, cancellationToken);
        return dto is null ? IssueErrors.NotFound(request.IssueId) : dto;
    }
}
