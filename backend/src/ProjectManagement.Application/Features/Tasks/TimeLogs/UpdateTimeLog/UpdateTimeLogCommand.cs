using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.UpdateTimeLog;

public record UpdateTimeLogCommand(Guid TimeLogId, decimal Hours, string? Description, DateOnly LoggedDate)
    : IRequest<Result<TimeLogDto>>;
