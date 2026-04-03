using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Messages.DTOs;

namespace ProjectManagement.Application.Features.Messages.SendMessage;

public sealed record SendMessageCommand(Guid TeamId, string AuthorId, string Content) : ICommand<MessageDto>;
