using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMessages.DTOs;

namespace ProjectManagement.Application.Features.ProjectMessages.SendProjectMessage;

public sealed record SendProjectMessageCommand(Guid ProjectId, string AuthorId, string Content)
    : ICommand<ProjectMessageDto>;
