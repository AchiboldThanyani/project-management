using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;

public sealed record UpdateProjectBoardCommand(
    Guid BoardId,
    string? Title,
    string? ContentJson,
    string UserId) : ICommand<ProjectBoardDetailDto>;
