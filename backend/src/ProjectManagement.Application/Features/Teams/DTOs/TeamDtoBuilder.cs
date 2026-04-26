using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Teams.DTOs;

public static class TeamDtoBuilder
{
    public static async Task<TeamDto> BuildAsync(
        Team team,
        IReadOnlyList<TeamMember> members,
        IUserRepository userRepository,
        CancellationToken cancellationToken)
    {
        var userIds = members.Select(m => m.UserId).Distinct().ToList();
        var users = await userRepository.GetUsersByIdsAsync(userIds, cancellationToken);
        var userMap = users.ToDictionary(u => u.Id, u => u);

        return new TeamDto
        {
            Id = team.Id,
            Name = team.Name,
            Description = team.Description,
            CreatedAt = team.CreatedAt,
            Members = members.Select(m =>
            {
                userMap.TryGetValue(m.UserId, out var user);
                return new TeamMemberDto
                {
                    UserId = m.UserId,
                    FullName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown User",
                    Email = user?.Email ?? string.Empty,
                    Role = m.Role,
                    JoinedAt = m.CreatedAt,
                };
            }).ToList()
        };
    }

    public static async Task<IReadOnlyList<TeamDto>> BuildManyAsync(
        IReadOnlyList<Team> teams,
        IReadOnlyList<TeamMember> allMembers,
        IUserRepository userRepository,
        CancellationToken cancellationToken)
    {
        var userIds = allMembers.Select(m => m.UserId).Distinct().ToList();
        var users = await userRepository.GetUsersByIdsAsync(userIds, cancellationToken);
        var userMap = users.ToDictionary(u => u.Id, u => u);

        var membersByTeam = allMembers.GroupBy(m => m.TeamId).ToDictionary(g => g.Key, g => g.ToList());

        return teams.Select(team =>
        {
            var members = membersByTeam.TryGetValue(team.Id, out var m) ? m : [];
            return new TeamDto
            {
                Id = team.Id,
                Name = team.Name,
                Description = team.Description,
                CreatedAt = team.CreatedAt,
                Members = members.Select(m =>
                {
                    userMap.TryGetValue(m.UserId, out var user);
                    return new TeamMemberDto
                    {
                        UserId = m.UserId,
                        FullName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown User",
                        Email = user?.Email ?? string.Empty,
                        Role = m.Role,
                        JoinedAt = m.CreatedAt,
                    };
                }).ToList()
            };
        }).ToList();
    }
}
