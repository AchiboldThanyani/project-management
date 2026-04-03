using AutoMapper;
using MediatR;
using Microsoft.Extensions.Caching.Memory;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Projects.GetProjects;

internal sealed class GetProjectsQueryHandler(IProjectRepository repository, IMapper mapper, IMemoryCache cache)
    : IRequestHandler<GetProjectsQuery, Result<PagedResult<ProjectDto>>>
{
    public async Task<Result<PagedResult<ProjectDto>>> Handle(GetProjectsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"projects:{request.UserId}:p{request.Page}:s{request.PageSize}";

        if (cache.TryGetValue(cacheKey, out PagedResult<ProjectDto>? cached) && cached is not null)
            return Result<PagedResult<ProjectDto>>.Success(cached);

        var (items, totalCount) = await repository.FindPagedAsync(
            p => p.OwnerId == request.UserId, request.Page, request.PageSize, cancellationToken);

        var dtos = mapper.Map<IReadOnlyList<ProjectDto>>(items);
        var result = new PagedResult<ProjectDto>(dtos, totalCount, request.Page, request.PageSize);

        cache.Set(cacheKey, result, TimeSpan.FromSeconds(30));

        return Result<PagedResult<ProjectDto>>.Success(result);
    }
}
