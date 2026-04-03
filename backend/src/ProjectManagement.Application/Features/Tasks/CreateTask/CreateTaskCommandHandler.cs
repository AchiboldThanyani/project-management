using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.CreateTask;

internal sealed class CreateTaskCommandHandler(
    ITaskRepository repository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateTaskCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(CreateTaskCommand request, CancellationToken cancellationToken)
    {
        var task = ProjectTask.Create(
            request.Title,
            request.ProjectId,
            request.ReporterId,
            request.Description,
            request.Priority,
            request.DueDate,
            request.SprintId,
            request.AssigneeId,
            request.StoryPoints);

        await repository.AddAsync(task, cancellationToken);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"created task \"{request.Title}\"", "Task", task.Id, request.Title);
        await activityRepository.AddAsync(log, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskDto>(task);
    }
}
