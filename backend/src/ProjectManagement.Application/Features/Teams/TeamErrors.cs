using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Teams;

public static class TeamErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Team.NotFound", $"Team with id '{id}' was not found.");

    public static Error MemberNotFound(string userId) =>
        Error.NotFound("Team.MemberNotFound", $"Member '{userId}' is not part of this team.");

    public static readonly Error MemberAlreadyExists =
        Error.Conflict("Team.MemberAlreadyExists", "User is already a member of this team.");
}
