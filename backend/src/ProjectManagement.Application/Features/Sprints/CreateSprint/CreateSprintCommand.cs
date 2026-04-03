using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.CreateSprint;

public sealed record CreateSprintCommand(
    string Name,
    string? Goal,
    DateTime StartDate,
    DateTime EndDate,
    Guid ProjectId) : ICommand<SprintDto>;
