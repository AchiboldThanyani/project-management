using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks;

public static class TaskErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Task.NotFound", $"Task with id '{id}' was not found.");
}
