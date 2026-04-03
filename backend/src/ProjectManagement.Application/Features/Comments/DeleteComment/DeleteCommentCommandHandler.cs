using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Comments.DeleteComment;

internal sealed class DeleteCommentCommandHandler(
    ICommentRepository repository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteCommentCommand, Result>
{
    public async Task<Result> Handle(DeleteCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await repository.GetByIdAsync(request.CommentId, cancellationToken);
        if (comment is null)
            return CommentErrors.NotFound(request.CommentId);

        if (comment.AuthorId != request.RequestingUserId)
            return CommentErrors.Forbidden;

        await repository.DeleteAsync(comment, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
