using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Messages.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Messages.SendMessage;

internal sealed class SendMessageCommandHandler(
    ITeamMessageRepository messageRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<SendMessageCommand, Result<MessageDto>>
{
    public async Task<Result<MessageDto>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var message = TeamMessage.Create(request.TeamId, request.AuthorId, request.Content);
        await messageRepository.AddAsync(message, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var user = await userRepository.GetUserByIdAsync(request.AuthorId, cancellationToken);

        return new MessageDto
        {
            Id = message.Id,
            TeamId = message.TeamId,
            AuthorId = message.AuthorId,
            AuthorName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown",
            Content = message.Content,
            CreatedAt = message.CreatedAt,
        };
    }
}
