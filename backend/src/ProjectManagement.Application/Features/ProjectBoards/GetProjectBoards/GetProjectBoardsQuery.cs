using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoards;

public sealed record GetProjectBoardsQuery(Guid ProjectId) : IQuery<IReadOnlyList<ProjectBoardDto>>;
