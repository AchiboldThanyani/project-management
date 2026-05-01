using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.UpdateTask;

internal sealed class UpdateTaskCommandHandler(
    ITaskRepository repository,
    IProjectMemberRepository memberRepository,
    ICurrentUserService currentUser,
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
            request.DueDate, request.SprintId, request.StoryPoints,
            estimatedHours: request.EstimatedHours);

        var existingUserIds = task.Assignees.Select(a => a.UserId).ToHashSet();
        task.Assignees.Clear();

        if (request.AssigneeIds.Count > 0)
        {
            var members = await memberRepository.GetByProjectAsync(task.ProjectId, cancellationToken);
            var memberMap = members.ToDictionary(m => m.UserId, m => m.FullName);

            foreach (var userId in request.AssigneeIds)
            {
                if (!memberMap.TryGetValue(userId, out var fullName)) continue;
                task.Assignees.Add(TaskAssignee.Create(task.Id, userId, fullName));

                if (!existingUserIds.Contains(userId))
                    task.RaiseAssignedEvent(userId, currentUser.UserId);
            }
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<TaskDto>(task);
    }
}
