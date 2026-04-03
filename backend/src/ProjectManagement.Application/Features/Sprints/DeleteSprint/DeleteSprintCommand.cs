using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Sprints.DeleteSprint;

public sealed record DeleteSprintCommand(Guid Id) : ICommand;
