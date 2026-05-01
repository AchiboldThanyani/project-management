using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMessages.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMessages.GetProjectMessages;

internal sealed class GetProjectMessagesQueryHandler(
    IProjectMessageRepository messageRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetProjectMessagesQuery, Result<IReadOnlyList<ProjectMessageDto>>>
{
    public async Task<Result<IReadOnlyList<ProjectMessageDto>>> Handle(
        GetProjectMessagesQuery request, CancellationToken cancellationToken)
    {
        var messages = await messageRepository.FindAsync(
            m => m.ProjectId == request.ProjectId, cancellationToken);

        var ordered = messages
            .OrderBy(m => m.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        var authorIds = ordered.Select(m => m.AuthorId).Distinct().ToList();
        var users = await Task.WhenAll(
            authorIds.Select(id => userRepository.GetUserByIdAsync(id, cancellationToken)));
        var userMap = users.Where(u => u is not null)
            .ToDictionary(u => u!.Id, u => u!);

        IReadOnlyList<ProjectMessageDto> result = ordered.Select(m =>
        {
            userMap.TryGetValue(m.AuthorId, out var user);
            return new ProjectMessageDto
            {
                Id = m.Id,
                ProjectId = m.ProjectId,
                AuthorId = m.AuthorId,
                AuthorName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                Content = m.Content,
                CreatedAt = m.CreatedAt,
            };
        }).ToList();

        return Result<IReadOnlyList<ProjectMessageDto>>.Success(result);
    }
}
