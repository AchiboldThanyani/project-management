using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Issues.AddIssueComment;

internal sealed class AddIssueCommentCommandHandler(
    IIssueRepository issueRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<AddIssueCommentCommand, Result<IssueCommentDto>>
{
    public async Task<Result<IssueCommentDto>> Handle(AddIssueCommentCommand request, CancellationToken cancellationToken)
    {
        var issue = await issueRepository.GetByIdAsync(request.IssueId, cancellationToken);
        if (issue is null) return IssueErrors.NotFound(request.IssueId);

        var comment = IssueComment.Create(request.IssueId, request.AuthorId, request.Content);
        await issueRepository.AddCommentAsync(comment, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new IssueCommentDto
        {
            Id = comment.Id,
            Content = comment.Content,
            AuthorId = comment.AuthorId,
            CreatedAt = comment.CreatedAt,
        };
    }
}
