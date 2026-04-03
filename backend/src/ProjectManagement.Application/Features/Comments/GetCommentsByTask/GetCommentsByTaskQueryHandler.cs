using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Comments.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Comments.GetCommentsByTask;

internal sealed class GetCommentsByTaskQueryHandler(ICommentRepository repository, IMapper mapper)
    : IRequestHandler<GetCommentsByTaskQuery, Result<IReadOnlyList<CommentDto>>>
{
    public async Task<Result<IReadOnlyList<CommentDto>>> Handle(GetCommentsByTaskQuery request, CancellationToken cancellationToken)
    {
        var comments = await repository.FindAsync(c => c.TaskId == request.TaskId, cancellationToken);
        return Result<IReadOnlyList<CommentDto>>.Success(mapper.Map<IReadOnlyList<CommentDto>>(comments.OrderBy(c => c.CreatedAt).ToList()));
    }
}
