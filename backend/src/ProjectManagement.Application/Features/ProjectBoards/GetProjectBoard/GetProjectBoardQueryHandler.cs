using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoard;

internal sealed class GetProjectBoardQueryHandler(IBoardRepository repository, IMapper mapper)
    : IRequestHandler<GetProjectBoardQuery, Result<ProjectBoardDetailDto>>
{
    public async Task<Result<ProjectBoardDetailDto>> Handle(GetProjectBoardQuery request, CancellationToken cancellationToken)
    {
        var board = await repository.GetByIdAsync(request.BoardId, cancellationToken);
        if (board is null)
            return Error.NotFound("Board.NotFound", $"Board {request.BoardId} not found.");
        return mapper.Map<ProjectBoardDetailDto>(board);
    }
}
