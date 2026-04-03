using FluentValidation;

namespace ProjectManagement.Application.Features.Comments.CreateComment;

public sealed class CreateCommentCommandValidator : AbstractValidator<CreateCommentCommand>
{
    public CreateCommentCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
        RuleFor(x => x.Content).NotEmpty().MaximumLength(10000);
        RuleFor(x => x.AuthorId).NotEmpty();
    }
}
