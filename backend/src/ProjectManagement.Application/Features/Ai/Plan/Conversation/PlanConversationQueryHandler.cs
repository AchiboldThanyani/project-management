using System.Text;
using System.Text.Json;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Ai.Plan.Conversation;

internal sealed class PlanConversationQueryHandler(
    IClaudeService claude,
    ICurrentUserService currentUser)
    : IRequestHandler<PlanConversationQuery, Result<PlanConversationResponse>>
{
    private const string ClarifyingSystemPrompt =
        """
        You are a project planning assistant inside a project management tool called ProjectHub.
        Help the Project Manager define a clear project or feature plan.
        Ask ONE focused clarifying question per turn. Cover: scope boundaries, target users, key constraints, success criteria, and estimated size.
        Do NOT generate a task list or spec until the user explicitly asks or types "generate".
        Keep responses short and conversational.
        """;

    private const string GenerationInstruction =
        "Now generate a comprehensive markdown project spec based on our conversation. Start with an H1 title, then a brief description paragraph, then key goals, scope, and any constraints we discussed.";

    private const string ExtractionInstruction =
        """
        Convert the project spec above into a JSON task list.
        Output ONLY a fenced JSON code block — no text before or after it.
        Each task must have exactly these fields: "title" (string), "description" (string), "priority" ("Low", "Medium", or "High").
        Aim for 5–15 tasks that cover the full scope.

        ```json
        [...]
        ```
        """;

    public async Task<Result<PlanConversationResponse>> Handle(PlanConversationQuery req, CancellationToken ct)
    {
        if (!currentUser.IsProjectManager && !currentUser.IsAdmin)
            return Error.Forbidden("Plan.Forbidden", "Only Project Managers and Admins can use Plan Mode.");

        var prompt = BuildPrompt(req);
        var raw = await claude.AskAsync(prompt, ct);

        if (req.Phase == PlanConversationPhase.Extracting)
        {
            var tasks = ExtractTasks(raw);
            return new PlanConversationResponse(null, tasks);
        }

        return new PlanConversationResponse(raw, null);
    }

    private static string BuildPrompt(PlanConversationQuery req)
    {
        var sb = new StringBuilder();

        if (req.Phase == PlanConversationPhase.Extracting)
        {
            sb.AppendLine(req.NewMessage);
            sb.AppendLine();
            sb.AppendLine(ExtractionInstruction);
            return sb.ToString();
        }

        sb.AppendLine(ClarifyingSystemPrompt);
        sb.AppendLine();

        foreach (var msg in req.History)
            sb.AppendLine($"[{(msg.Role == "user" ? "User" : "Assistant")}]: {msg.Content}");

        if (req.History.Count > 0)
            sb.AppendLine();

        sb.AppendLine(req.Phase == PlanConversationPhase.Generating
            ? GenerationInstruction
            : $"User: {req.NewMessage}");

        return sb.ToString();
    }

    public static List<PlanTaskItem> ExtractTasks(string rawResponse)
    {
        var fenceStart = rawResponse.IndexOf("```json", StringComparison.OrdinalIgnoreCase);
        if (fenceStart == -1) return [];

        var lineBreak = rawResponse.IndexOf('\n', fenceStart);
        if (lineBreak == -1) return [];
        var contentStart = lineBreak + 1;

        var fenceEnd = rawResponse.IndexOf("```", contentStart);
        if (fenceEnd == -1 || contentStart >= fenceEnd) return [];

        var json = rawResponse[contentStart..fenceEnd].Trim();

        try
        {
            var elements = JsonSerializer.Deserialize<List<JsonElement>>(json);
            if (elements == null) return [];

            var result = new List<PlanTaskItem>();
            foreach (var el in elements)
            {
                try
                {
                    var title = el.GetProperty("title").GetString();
                    var desc = el.GetProperty("description").GetString();
                    var priorityStr = el.GetProperty("priority").GetString();
                    if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(desc) || priorityStr == null)
                        continue;
                    if (!Enum.TryParse<TaskPriority>(priorityStr, true, out var priority))
                        continue;
                    if (priority is not (TaskPriority.Low or TaskPriority.Medium or TaskPriority.High))
                        continue;
                    result.Add(new PlanTaskItem(title, desc, priority));
                }
                catch { /* skip malformed item */ }
            }
            return result;
        }
        catch
        {
            return [];
        }
    }
}
