using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Activity.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Activity.GetActivity;

internal sealed class GetActivityQueryHandler(IActivityRepository activityRepository)
    : IRequestHandler<GetActivityQuery, Result<IReadOnlyList<ActivityDto>>>
{
    public async Task<Result<IReadOnlyList<ActivityDto>>> Handle(GetActivityQuery request, CancellationToken cancellationToken)
    {
        var logs = await activityRepository.GetRecentAsync(request.Count, cancellationToken);

        IReadOnlyList<ActivityDto> result = logs.Select(l => new ActivityDto
        {
            Id = l.Id,
            UserId = l.UserId,
            UserName = l.UserName,
            Action = l.Action,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            EntityName = l.EntityName,
            CreatedAt = l.CreatedAt,
        }).ToList();

        return Result<IReadOnlyList<ActivityDto>>.Success(result);
    }
}
