using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.UpdateTask;

internal sealed class UpdateTaskCommandHandler(
    ITaskRepository repository,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateTaskCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(UpdateTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (task is null)
            return TaskErrors.NotFound(request.Id);

        task.Update(request.Title, request.Description, request.Priority,
            request.DueDate, request.SprintId, request.AssigneeId, request.StoryPoints,
            estimatedHours: request.EstimatedHours);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<TaskDto>(task);
    }
}
