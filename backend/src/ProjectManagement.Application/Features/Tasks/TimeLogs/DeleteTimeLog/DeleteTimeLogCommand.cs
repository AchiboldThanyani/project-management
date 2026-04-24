using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.TimeLogs.DeleteTimeLog;

public record DeleteTimeLogCommand(Guid TimeLogId) : IRequest<Result>;
