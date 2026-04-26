using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoard;

public sealed record GetProjectBoardQuery(Guid BoardId) : IQuery<ProjectBoardDetailDto>;
