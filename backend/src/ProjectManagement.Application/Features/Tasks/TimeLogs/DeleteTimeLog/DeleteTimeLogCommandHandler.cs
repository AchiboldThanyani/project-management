using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.DeleteTimeLog;

internal sealed class DeleteTimeLogCommandHandler(ITimeLogRepository repo, ICurrentUserService currentUser)
    : IRequestHandler<DeleteTimeLogCommand, Result>
{
    public async Task<Result> Handle(DeleteTimeLogCommand request, CancellationToken ct)
    {
        var log = await repo.GetByIdAsync(request.TimeLogId, ct);
        if (log is null) return Error.NotFound("TimeLog.NotFound", "Time log not found");
        if (log.UserId != currentUser.UserId)
            return Error.Forbidden("TimeLog.Forbidden", "You can only delete your own time logs");

        repo.Remove(log);
        await repo.SaveAsync(ct);
        return Result.Success();
    }
}
