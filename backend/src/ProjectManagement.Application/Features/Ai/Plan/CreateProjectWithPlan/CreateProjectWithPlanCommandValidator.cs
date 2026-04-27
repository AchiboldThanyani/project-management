using FluentValidation;

namespace ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;

public sealed class CreateProjectWithPlanCommandValidator : AbstractValidator<CreateProjectWithPlanCommand>
{
    public CreateProjectWithPlanCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Tasks).NotNull();
        RuleForEach(x => x.Tasks).ChildRules(task =>
        {
            task.RuleFor(t => t.Title).NotEmpty().MaximumLength(500);
            task.RuleFor(t => t.Description).MaximumLength(2000);
        });
    }
}
