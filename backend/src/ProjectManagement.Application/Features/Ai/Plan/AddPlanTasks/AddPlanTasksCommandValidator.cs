using FluentValidation;

namespace ProjectManagement.Application.Features.Ai.Plan.AddPlanTasks;

public sealed class AddPlanTasksCommandValidator : AbstractValidator<AddPlanTasksCommand>
{
    public AddPlanTasksCommandValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Tasks).NotNull().NotEmpty();
        RuleForEach(x => x.Tasks).ChildRules(task =>
        {
            task.RuleFor(t => t.Title).NotEmpty().MaximumLength(500);
            task.RuleFor(t => t.Description).MaximumLength(2000);
        });
    }
}
