using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.GetTasksByProject;

internal sealed class GetTasksByProjectQueryHandler(ITaskRepository repository, IMapper mapper)
    : IRequestHandler<GetTasksByProjectQuery, Result<PagedResult<TaskDto>>>
{
    public async Task<Result<PagedResult<TaskDto>>> Handle(GetTasksByProjectQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await repository.FindPagedAsync(
            t => t.ProjectId == request.ProjectId, request.Page, request.PageSize, cancellationToken);

        var dtos = mapper.Map<IReadOnlyList<TaskDto>>(items);
        return Result<PagedResult<TaskDto>>.Success(new PagedResult<TaskDto>(dtos, totalCount, request.Page, request.PageSize));
    }
}
