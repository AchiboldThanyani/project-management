using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.LogTime;

internal sealed class LogTimeCommandHandler(ITimeLogRepository repo, ITaskRepository taskRepo, ICurrentUserService currentUser)
    : IRequestHandler<LogTimeCommand, Result<TimeLogDto>>
{
    public async Task<Result<TimeLogDto>> Handle(LogTimeCommand request, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(request.TaskId, ct);
        if (task is null) return Error.NotFound("Task.NotFound", "Task not found");

        var log = TimeLog.Create(request.TaskId, currentUser.UserId!, request.Hours, request.LoggedDate, request.Description);

        await repo.AddAsync(log, ct);
        await repo.SaveAsync(ct);

        return new TimeLogDto { Id = log.Id, TaskId = log.TaskId, UserId = log.UserId, Hours = log.Hours, Description = log.Description, LoggedDate = log.LoggedDate, CreatedAt = log.CreatedAt };
    }
}
