using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Ai.Plan.Conversation;

public sealed record PlanConversationQuery(
    IReadOnlyList<PlanConversationMessage> History,
    string NewMessage,
    PlanConversationPhase Phase)
    : IRequest<Result<PlanConversationResponse>>;
