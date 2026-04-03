using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.UpdateSprint;

public sealed record UpdateSprintCommand(
    Guid Id,
    string Name,
    string? Goal,
    DateTime StartDate,
    DateTime EndDate) : ICommand<SprintDto>;
