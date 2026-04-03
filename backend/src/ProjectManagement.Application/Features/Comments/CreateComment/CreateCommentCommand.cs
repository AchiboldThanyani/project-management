using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Comments.DTOs;

namespace ProjectManagement.Application.Features.Comments.CreateComment;

public sealed record CreateCommentCommand(Guid TaskId, string Content, string AuthorId) : ICommand<CommentDto>;
