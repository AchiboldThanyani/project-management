using FluentValidation;

namespace ProjectManagement.Application.Features.Tasks.CreateTask;

public sealed class CreateTaskCommandValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Description).MaximumLength(5000);
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.ReporterId).NotEmpty();
        RuleFor(x => x.StoryPoints).InclusiveBetween(1, 100).When(x => x.StoryPoints.HasValue);
    }
}
