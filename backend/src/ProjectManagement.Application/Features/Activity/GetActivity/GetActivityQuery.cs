using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Activity.DTOs;

namespace ProjectManagement.Application.Features.Activity.GetActivity;

public sealed record GetActivityQuery(int Count = 50) : IQuery<IReadOnlyList<ActivityDto>>;
