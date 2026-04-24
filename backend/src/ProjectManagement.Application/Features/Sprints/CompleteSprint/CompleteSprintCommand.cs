using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;

namespace ProjectManagement.Application.Features.Sprints.CompleteSprint;

public sealed record CompleteSprintCommand(Guid Id, string? RetroNotes = null) : ICommand<SprintDto>;
