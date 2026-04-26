using FluentValidation;

namespace ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;

public sealed class CreateProjectBoardCommandValidator : AbstractValidator<CreateProjectBoardCommand>
{
    public CreateProjectBoardCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.CreatedById).NotEmpty();
    }
}
