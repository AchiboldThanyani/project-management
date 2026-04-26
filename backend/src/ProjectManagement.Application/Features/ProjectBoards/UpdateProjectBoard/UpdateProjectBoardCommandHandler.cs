using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;

internal sealed class UpdateProjectBoardCommandHandler(
    IBoardRepository repository,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateProjectBoardCommand, Result<ProjectBoardDetailDto>>
{
    public async Task<Result<ProjectBoardDetailDto>> Handle(UpdateProjectBoardCommand request, CancellationToken cancellationToken)
    {
        var board = await repository.GetByIdAsync(request.BoardId, cancellationToken);
        if (board is null)
            return Error.NotFound("Board.NotFound", $"Board {request.BoardId} not found.");

        if (!await permissions.HasProjectRoleAsync(board.ProjectId, request.UserId, ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Board.Forbidden", "You must be a project member to edit boards.");

        if (request.Title is not null)
            board.UpdateTitle(request.Title);

        if (request.ContentJson is not null)
            board.UpdateContent(request.ContentJson);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProjectBoardDetailDto>(board);
    }
}
