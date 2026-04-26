using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.UpdateTimeLog;

internal sealed class UpdateTimeLogCommandHandler(ITimeLogRepository repo, ICurrentUserService currentUser)
    : IRequestHandler<UpdateTimeLogCommand, Result<TimeLogDto>>
{
    public async Task<Result<TimeLogDto>> Handle(UpdateTimeLogCommand request, CancellationToken ct)
    {
        var log = await repo.GetByIdAsync(request.TimeLogId, ct);
        if (log is null) return Error.NotFound("TimeLog.NotFound", "Time log not found");
        if (log.UserId != currentUser.UserId)
            return Error.Forbidden("TimeLog.Forbidden", "You can only edit your own time logs");

        log.Update(request.Hours, request.Description, request.LoggedDate);
        await repo.SaveAsync(ct);

        return new TimeLogDto
        {
            Id = log.Id, TaskId = log.TaskId, SubTaskId = log.SubTaskId,
            UserId = log.UserId, Hours = log.Hours, Description = log.Description,
            LoggedDate = log.LoggedDate, CreatedAt = log.CreatedAt
        };
    }
}
