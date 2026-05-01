using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.CreateTask;

internal sealed class CreateTaskCommandHandler(
    ITaskRepository repository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IProjectPermissionService permissions,
    IProjectMemberRepository memberRepository,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateTaskCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(CreateTaskCommand request, CancellationToken cancellationToken)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Member, cancellationToken))
            return Error.Forbidden("Task.Forbidden", "You must be a project member to create tasks.");

        var taskNumber = await repository.GetNextTaskNumberAsync(request.ProjectId, cancellationToken);

        var task = ProjectTask.Create(
            request.Title,
            request.ProjectId,
            request.ReporterId,
            taskNumber,
            request.Description,
            request.Priority,
            request.DueDate,
            request.SprintId,
            request.StoryPoints);

        if (request.AssigneeIds.Count > 0)
        {
            var members = await memberRepository.GetByProjectAsync(request.ProjectId, cancellationToken);
            var memberMap = members.ToDictionary(m => m.UserId, m => m.FullName);

            foreach (var userId in request.AssigneeIds)
            {
                if (!memberMap.TryGetValue(userId, out var fullName)) continue;
                task.Assignees.Add(TaskAssignee.Create(task.Id, userId, fullName));
                task.RaiseAssignedEvent(userId, currentUser.UserId);
            }
        }

        await repository.AddAsync(task, cancellationToken);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"created task \"{request.Title}\"", "Task", task.Id, request.Title,
            projectId: request.ProjectId);
        await activityRepository.AddAsync(log, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskDto>(task);
    }
}
