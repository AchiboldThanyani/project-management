using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;

namespace ProjectManagement.Application.Features.Projects.CreateProject;

public sealed record CreateProjectCommand(
    string Name,
    string? Description,
    Guid? TeamId,
    DateTime? StartDate,
    DateTime? EndDate,
    string OwnerId) : ICommand<ProjectDto>;
