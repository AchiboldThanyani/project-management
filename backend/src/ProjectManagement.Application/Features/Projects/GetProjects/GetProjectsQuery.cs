using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;

namespace ProjectManagement.Application.Features.Projects.GetProjects;

public sealed record GetProjectsQuery(string UserId, int Page = 1, int PageSize = 20) : IQuery<PagedResult<ProjectDto>>;
