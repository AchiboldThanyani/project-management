using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Messages.DTOs;

namespace ProjectManagement.Application.Features.Messages.GetTeamMessages;

public sealed record GetTeamMessagesQuery(Guid TeamId, int Page = 1, int PageSize = 50) : IQuery<IReadOnlyList<MessageDto>>;
