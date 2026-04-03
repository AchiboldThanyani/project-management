using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;

namespace ProjectManagement.Application.Features.Tasks.GetTasksByProject;

public sealed record GetTasksByProjectQuery(Guid ProjectId, int Page = 1, int PageSize = 50) : IQuery<PagedResult<TaskDto>>;
