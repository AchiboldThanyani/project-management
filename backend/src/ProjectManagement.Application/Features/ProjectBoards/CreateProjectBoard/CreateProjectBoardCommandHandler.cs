using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;

internal sealed class CreateProjectBoardCommandHandler(
    IBoardRepository repository,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateProjectBoardCommand, Result<ProjectBoardDto>>
{
    public async Task<Result<ProjectBoardDto>> Handle(CreateProjectBoardCommand request, CancellationToken cancellationToken)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, request.CreatedById, ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Board.Forbidden", "You must be a project member to create boards.");

        var board = ProjectBoard.Create(request.Title, request.ProjectId, request.CreatedById);
        await repository.AddAsync(board, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProjectBoardDto>(board);
    }
}
