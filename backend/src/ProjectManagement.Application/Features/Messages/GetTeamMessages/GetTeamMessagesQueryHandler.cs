using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Messages.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Messages.GetTeamMessages;

internal sealed class GetTeamMessagesQueryHandler(
    ITeamMessageRepository messageRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetTeamMessagesQuery, Result<IReadOnlyList<MessageDto>>>
{
    public async Task<Result<IReadOnlyList<MessageDto>>> Handle(GetTeamMessagesQuery request, CancellationToken cancellationToken)
    {
        var messages = await messageRepository.FindAsync(m => m.TeamId == request.TeamId, cancellationToken);

        var ordered = messages
            .OrderBy(m => m.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        var authorIds = ordered.Select(m => m.AuthorId).Distinct().ToList();
        var users = await Task.WhenAll(authorIds.Select(id => userRepository.GetUserByIdAsync(id, cancellationToken)));
        var userMap = users.Where(u => u is not null).ToDictionary(u => u!.Id, u => u!);

        IReadOnlyList<MessageDto> result = ordered.Select(m =>
        {
            userMap.TryGetValue(m.AuthorId, out var user);
            return new MessageDto
            {
                Id = m.Id,
                TeamId = m.TeamId,
                AuthorId = m.AuthorId,
                AuthorName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                Content = m.Content,
                CreatedAt = m.CreatedAt,
            };
        }).ToList();

        return Result<IReadOnlyList<MessageDto>>.Success(result);
    }
}
