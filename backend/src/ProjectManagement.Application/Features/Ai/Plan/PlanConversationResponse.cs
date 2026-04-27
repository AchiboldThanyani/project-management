namespace ProjectManagement.Application.Features.Ai.Plan;

/// <summary>
/// During Clarifying or Generating phases, <see cref="Response"/> is populated and <see cref="Tasks"/> is null.
/// During Extracting phase, <see cref="Tasks"/> is populated and <see cref="Response"/> is null.
/// Both being null indicates an error condition the handler must guard against.
/// </summary>
public sealed record PlanConversationResponse(
    string? Response,
    IReadOnlyList<PlanTaskItem>? Tasks);
