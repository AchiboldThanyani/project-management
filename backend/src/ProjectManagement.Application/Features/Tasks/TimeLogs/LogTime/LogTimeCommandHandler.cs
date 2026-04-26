using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.LogTime;

internal sealed class LogTimeCommandHandler(
    ITimeLogRepository repo,
    ITaskRepository taskRepo,
    ISubTaskRepository subTaskRepo,
    ICurrentUserService currentUser)
    : IRequestHandler<LogTimeCommand, Result<TimeLogDto>>
{
    public async Task<Result<TimeLogDto>> Handle(LogTimeCommand request, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(request.TaskId, ct);
        if (task is null) return Error.NotFound("Task.NotFound", "Task not found");

        if (request.Hours <= 0)
            return Error.Validation("TimeLog.InvalidHours", "Hours must be greater than 0");

        if (request.SubTaskId.HasValue)
        {
            var subTask = await subTaskRepo.GetByIdAsync(request.SubTaskId.Value, ct);
            if (subTask is null || subTask.TaskId != request.TaskId)
                return Error.Validation("TimeLog.InvalidSubTask", "SubTask does not belong to this task");
        }

        var log = TimeLog.Create(request.TaskId, currentUser.UserId!, request.Hours, request.LoggedDate,
            request.Description, request.SubTaskId);

        await repo.AddAsync(log, ct);
        await repo.SaveAsync(ct);

        return new TimeLogDto
        {
            Id = log.Id, TaskId = log.TaskId, SubTaskId = log.SubTaskId,
            UserId = log.UserId, Hours = log.Hours, Description = log.Description,
            LoggedDate = log.LoggedDate, CreatedAt = log.CreatedAt
        };
    }
}
