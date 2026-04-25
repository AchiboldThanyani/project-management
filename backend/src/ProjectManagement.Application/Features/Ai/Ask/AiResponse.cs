namespace ProjectManagement.Application.Features.Ai.Ask;

public sealed record AiResponse(string Answer, IReadOnlyList<string> Suggestions);
