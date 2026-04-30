using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Updates.GetProjectUpdatesFeed;

internal sealed class GetProjectUpdatesFeedQueryHandler(
    IProjectMemberRepository memberRepo,
    ITimeLogRepository timeLogRepo,
    IActivityRepository activityRepo)
    : IRequestHandler<GetProjectUpdatesFeedQuery, Result<IReadOnlyList<UpdatesFeedDayDto>>>
{
    public async Task<Result<IReadOnlyList<UpdatesFeedDayDto>>> Handle(
        GetProjectUpdatesFeedQuery req, CancellationToken ct)
    {
        var days = Math.Clamp(req.Days, 1, 90);
        var since = DateTime.UtcNow.AddDays(-days);
        var sinceDate = DateOnly.FromDateTime(since);

        var members = await memberRepo.GetByProjectAsync(req.ProjectId, ct);
        var nameMap = members.ToDictionary(m => m.UserId, m => m.FullName);

        var timeLogs = await timeLogRepo.GetByProjectSinceAsync(req.ProjectId, sinceDate, ct);
        var activities = await activityRepo.GetByProjectSinceAsync(req.ProjectId, since, ct);

        var days_range = Enumerable.Range(0, days)
            .Select(i => DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-i)))
            .ToList();

        var result = days_range
            .Select(date =>
            {
                var dayLogs = timeLogs.Where(t => t.LoggedDate == date).ToList();
                var dayActivity = activities.Where(a => DateOnly.FromDateTime(a.CreatedAt) == date).ToList();

                var memberIds = dayLogs.Select(t => t.UserId)
                    .Concat(dayActivity.Select(a => a.UserId))
                    .Distinct()
                    .ToList();

                var memberDtos = memberIds
                    .Select(uid => new UpdatesFeedMemberDto(
                        uid,
                        nameMap.GetValueOrDefault(uid, "Unknown"),
                        dayLogs
                            .Where(t => t.UserId == uid)
                            .Select(t => new UpdatesTimeLogDto(
                                t.Task?.Title ?? "Unknown task",
                                t.Hours,
                                t.Description))
                            .ToList(),
                        dayActivity
                            .Where(a => a.UserId == uid)
                            .Take(15)
                            .Select(a => new UpdatesActivityDto(a.Action, a.EntityType, a.EntityName, a.CreatedAt))
                            .ToList()))
                    .ToList();

                return new UpdatesFeedDayDto(date, memberDtos);
            })
            .Where(d => d.Members.Count > 0)
            .ToList();

        return Result<IReadOnlyList<UpdatesFeedDayDto>>.Success(result);
    }
}
