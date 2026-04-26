using FluentValidation;

namespace ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;

public sealed class UpdateProjectBoardCommandValidator : AbstractValidator<UpdateProjectBoardCommand>
{
    public UpdateProjectBoardCommandValidator()
    {
        RuleFor(x => x.BoardId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Title).MaximumLength(200).When(x => x.Title is not null);
    }
}
