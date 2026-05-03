using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tasks.GetTaskById;

internal sealed class GetTaskByIdQueryHandler(
    ITaskRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IMapper mapper)
    : IRequestHandler<GetTaskByIdQuery, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(GetTaskByIdQuery request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return TaskErrors.NotFound(request.TaskId);

        if (!await permissions.HasProjectRoleAsync(task.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Task.Forbidden", "You do not have access to this task.");

        return mapper.Map<TaskDto>(task);
    }
}
