using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.DeleteTask;

public sealed record DeleteTaskCommand(Guid TaskId) : ICommand;
