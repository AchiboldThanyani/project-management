using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.ProjectBoards.DeleteProjectBoard;

public sealed record DeleteProjectBoardCommand(Guid BoardId, string UserId) : ICommand;
