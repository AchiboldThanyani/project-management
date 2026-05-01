using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMessages.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectMessages.SendProjectMessage;

internal sealed class SendProjectMessageCommandHandler(
    IProjectMessageRepository messageRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<SendProjectMessageCommand, Result<ProjectMessageDto>>
{
    public async Task<Result<ProjectMessageDto>> Handle(
        SendProjectMessageCommand request, CancellationToken cancellationToken)
    {
        var message = ProjectMessage.Create(request.ProjectId, request.AuthorId, request.Content);
        await messageRepository.AddAsync(message, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var user = await userRepository.GetUserByIdAsync(request.AuthorId, cancellationToken);

        return Result<ProjectMessageDto>.Success(new ProjectMessageDto
        {
            Id = message.Id,
            ProjectId = message.ProjectId,
            AuthorId = message.AuthorId,
            AuthorName = user is not null ? $"{user.FirstName} {user.LastName}" : "Unknown",
            Content = message.Content,
            CreatedAt = message.CreatedAt,
        });
    }
}
