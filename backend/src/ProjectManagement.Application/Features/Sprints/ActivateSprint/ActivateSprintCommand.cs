using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.ActivateSprint;

public sealed record ActivateSprintCommand(Guid Id) : ICommand<SprintDto>;
