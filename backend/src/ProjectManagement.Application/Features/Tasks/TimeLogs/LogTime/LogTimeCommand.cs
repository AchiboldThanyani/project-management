using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.LogTime;

public record LogTimeCommand(Guid TaskId, decimal Hours, DateOnly LoggedDate, string? Description, Guid? SubTaskId = null)
    : IRequest<Result<TimeLogDto>>;
