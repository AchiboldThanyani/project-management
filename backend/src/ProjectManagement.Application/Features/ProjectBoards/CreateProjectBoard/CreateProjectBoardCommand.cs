using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;

public sealed record CreateProjectBoardCommand(
    string Title,
    Guid ProjectId,
    string CreatedById) : ICommand<ProjectBoardDto>;
