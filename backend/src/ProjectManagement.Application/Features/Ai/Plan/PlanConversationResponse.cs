namespace ProjectManagement.Application.Features.Ai.Plan;

public sealed record PlanConversationResponse(
    string? Response,
    IReadOnlyList<PlanTaskItem>? Tasks);
