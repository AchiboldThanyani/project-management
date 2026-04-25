using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.UpdateTaskStatus;

internal sealed class UpdateTaskStatusCommandHandler(
    ITaskRepository repository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateTaskStatusCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(UpdateTaskStatusCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return TaskErrors.NotFound(request.TaskId);

        if (!await permissions.HasProjectRoleAsync(task.ProjectId, currentUser.UserId, ProjectMemberRole.Member, cancellationToken))
            return Error.Forbidden("Task.Forbidden", "You must be a project member to update task status.");

        task.ChangeStatus(request.Status, currentUser.UserId);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskDto>(task);
    }
}
