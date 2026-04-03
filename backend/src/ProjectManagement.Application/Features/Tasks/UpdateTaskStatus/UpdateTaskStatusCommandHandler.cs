using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.UpdateTaskStatus;

internal sealed class UpdateTaskStatusCommandHandler(
    ITaskRepository repository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateTaskStatusCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(UpdateTaskStatusCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return TaskErrors.NotFound(request.TaskId);

        // Domain event raised inside ChangeStatus — activity log written by the event handler
        task.ChangeStatus(request.Status, currentUser.UserId);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskDto>(task);
    }
}
