using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.DeleteProjectBoard;

internal sealed class DeleteProjectBoardCommandHandler(
    IBoardRepository repository,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteProjectBoardCommand, Result>
{
    public async Task<Result> Handle(DeleteProjectBoardCommand request, CancellationToken cancellationToken)
    {
        var board = await repository.GetByIdAsync(request.BoardId, cancellationToken);
        if (board is null)
            return Error.NotFound("Board.NotFound", $"Board {request.BoardId} not found.");

        if (!await permissions.HasProjectRoleAsync(board.ProjectId, request.UserId, ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Board.Forbidden", "You must be a project member to delete boards.");

        await repository.DeleteAsync(board, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
