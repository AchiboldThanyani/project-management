using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Updates.GetProjectUpdatesFeed;

public record GetProjectUpdatesFeedQuery(Guid ProjectId, int Days = 14) : IQuery<IReadOnlyList<UpdatesFeedDayDto>>;
