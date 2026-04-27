using ProjectManagement.Application.Features.Ai.Plan;
using ProjectManagement.Application.Features.Ai.Plan.Conversation;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Tests.Ai.Plan;

public class PlanConversationHandlerRoleTests
{
    private sealed class FakeClaude : IClaudeService
    {
        public string ReturnValue { get; set; } = "response";
        public Task<string> AskAsync(string prompt, CancellationToken ct = default)
            => Task.FromResult(ReturnValue);
    }

    private sealed class FakeUser : ICurrentUserService
    {
        public string UserId { get; set; } = "u1";
        public string FullName { get; set; } = "Test User";
        public bool IsAdmin { get; set; }
        public bool IsProjectManager { get; set; }
    }

    [Fact]
    public async Task Handle_NonPmNonAdmin_ReturnsForbidden()
    {
        var handler = new PlanConversationQueryHandler(new FakeClaude(), new FakeUser { IsProjectManager = false, IsAdmin = false });
        var query = new PlanConversationQuery([], "hello", PlanConversationPhase.Clarifying);

        var result = await handler.Handle(query, default);

        Assert.False(result.IsSuccess);
        Assert.Equal("Forbidden", result.Error!.Type.ToString());
    }

    [Fact]
    public async Task Handle_ProjectManager_ReturnsResponse()
    {
        var claude = new FakeClaude { ReturnValue = "What is the target user?" };
        var handler = new PlanConversationQueryHandler(claude, new FakeUser { IsProjectManager = true });
        var query = new PlanConversationQuery([], "I want a time tracker", PlanConversationPhase.Clarifying);

        var result = await handler.Handle(query, default);

        Assert.True(result.IsSuccess);
        Assert.Equal("What is the target user?", result.Value!.Response);
        Assert.Null(result.Value.Tasks);
    }

    [Fact]
    public async Task Handle_ExtractingPhase_ReturnsParsedTasks()
    {
        var raw = """
            ```json
            [{"title":"Setup","description":"desc","priority":"High"}]
            ```
            """;
        var claude = new FakeClaude { ReturnValue = raw };
        var handler = new PlanConversationQueryHandler(claude, new FakeUser { IsProjectManager = true });
        var spec = "# My Project\nDescription.";
        var query = new PlanConversationQuery([], spec, PlanConversationPhase.Extracting);

        var result = await handler.Handle(query, default);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value!.Response);
        Assert.Single(result.Value.Tasks!);
        Assert.Equal("Setup", result.Value.Tasks![0].Title);
    }
}
