using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Comments.DTOs;

namespace ProjectManagement.Application.Features.Comments.GetCommentsByTask;

public sealed record GetCommentsByTaskQuery(Guid TaskId) : IQuery<IReadOnlyList<CommentDto>>;
