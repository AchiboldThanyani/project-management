using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Issues.ConvertToTask;

internal sealed class ConvertIssueToTaskCommandHandler(
    IIssueRepository issueRepository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<ConvertIssueToTaskCommand, Result<TaskDto>>
{
    public async Task<Result<TaskDto>> Handle(ConvertIssueToTaskCommand request, CancellationToken cancellationToken)
    {
        var issue = await issueRepository.GetByIdAsync(request.IssueId, cancellationToken);
        if (issue is null) return IssueErrors.NotFound(request.IssueId);
        if (issue.ConvertedToTaskId.HasValue) return IssueErrors.AlreadyConverted;

        var taskNumber = await taskRepository.GetNextTaskNumberAsync(issue.ProjectId, cancellationToken);
        var task = ProjectTask.Create(
            issue.Title,
            issue.ProjectId,
            issue.ReporterId,
            taskNumber,
            issue.Description,
            request.Priority ?? issue.Priority,
            null,
            request.SprintId);

        await taskRepository.AddAsync(task, cancellationToken);
        issue.MarkConvertedToTask(task.Id);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"converted issue #{issue.Number} to a task", "Task", task.Id, task.Title,
            projectId: task.ProjectId);
        await activityRepository.AddAsync(log, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new TaskDto
        {
            Id = task.Id,
            TaskNumber = task.TaskNumber,
            Title = task.Title,
            Description = task.Description,
            Priority = task.Priority,
            Status = task.Status,
            ProjectId = task.ProjectId,
            SprintId = task.SprintId,
            ReporterId = task.ReporterId,
            CreatedAt = task.CreatedAt,
        };
    }
}
