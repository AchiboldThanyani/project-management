using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Users.DTOs;

namespace ProjectManagement.Application.Features.Users.Queries;

public sealed record GetUsersQuery : IQuery<IReadOnlyList<UserDto>>;
