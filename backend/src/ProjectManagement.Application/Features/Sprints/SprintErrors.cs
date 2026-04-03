using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Sprints;

public static class SprintErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Sprint.NotFound", $"Sprint with id '{id}' was not found.");
}
