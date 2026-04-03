using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Projects;

public static class ProjectErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Project.NotFound", $"Project with id '{id}' was not found.");
}
