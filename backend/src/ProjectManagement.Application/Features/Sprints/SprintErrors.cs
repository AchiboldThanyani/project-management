using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Sprints;

public static class SprintErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Sprint.NotFound", $"Sprint with id '{id}' was not found.");

    public static Error InvalidCarryOverTarget(Guid targetId) =>
        Error.Validation("Sprint.InvalidCarryOverTarget",
            $"Sprint {targetId} is not a valid carry-over target. It must belong to the same project and not be completed.");
}
