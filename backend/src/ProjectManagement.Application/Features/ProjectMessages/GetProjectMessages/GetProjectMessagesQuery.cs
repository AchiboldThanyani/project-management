using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectMessages.DTOs;

namespace ProjectManagement.Application.Features.ProjectMessages.GetProjectMessages;

public sealed record GetProjectMessagesQuery(Guid ProjectId, int Page = 1, int PageSize = 50)
    : IQuery<IReadOnlyList<ProjectMessageDto>>;
