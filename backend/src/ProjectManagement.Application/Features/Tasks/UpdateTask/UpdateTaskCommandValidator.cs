using FluentValidation;

namespace ProjectManagement.Application.Features.Tasks.UpdateTask;

public sealed class UpdateTaskCommandValidator : AbstractValidator<UpdateTaskCommand>
{
    public UpdateTaskCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Description).MaximumLength(5000);
        RuleFor(x => x.StoryPoints).InclusiveBetween(1, 100).When(x => x.StoryPoints.HasValue);
    }
}
