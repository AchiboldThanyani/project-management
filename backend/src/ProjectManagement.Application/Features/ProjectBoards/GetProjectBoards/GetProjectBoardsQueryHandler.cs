using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoards;

internal sealed class GetProjectBoardsQueryHandler(IBoardRepository repository, IMapper mapper)
    : IRequestHandler<GetProjectBoardsQuery, Result<IReadOnlyList<ProjectBoardDto>>>
{
    public async Task<Result<IReadOnlyList<ProjectBoardDto>>> Handle(GetProjectBoardsQuery request, CancellationToken cancellationToken)
    {
        var boards = await repository.GetBoardsByProjectAsync(request.ProjectId, cancellationToken);
        return Result<IReadOnlyList<ProjectBoardDto>>.Success(mapper.Map<IReadOnlyList<ProjectBoardDto>>(boards));
    }
}
