using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Users.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Users.Queries;

internal sealed class GetUsersQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetUsersQuery, Result<IReadOnlyList<UserDto>>>
{
    public async Task<Result<IReadOnlyList<UserDto>>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var users = await userRepository.GetAllUsersAsync(cancellationToken);
        return Result<IReadOnlyList<UserDto>>.Success(users);
    }
}
