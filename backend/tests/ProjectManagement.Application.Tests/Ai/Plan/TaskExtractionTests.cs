using ProjectManagement.Application.Features.Ai.Plan.Conversation;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Tests.Ai.Plan;

public class TaskExtractionTests
{
    [Fact]
    public void ExtractTasks_ValidJson_ReturnsAllTasks()
    {
        var raw = """
            ```json
            [
              {"title":"Set up repo","description":"Initialize git","priority":"High"},
              {"title":"Design DB","description":"ERD design","priority":"Medium"}
            ]
            ```
            """;

        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);

        Assert.Equal(2, tasks.Count);
        Assert.Equal("Set up repo", tasks[0].Title);
        Assert.Equal(TaskPriority.High, tasks[0].Priority);
        Assert.Equal("Design DB", tasks[1].Title);
        Assert.Equal(TaskPriority.Medium, tasks[1].Priority);
    }

    [Fact]
    public void ExtractTasks_NoFence_ReturnsEmpty()
    {
        var tasks = PlanConversationQueryHandler.ExtractTasks("No JSON here at all.");
        Assert.Empty(tasks);
    }

    [Fact]
    public void ExtractTasks_MalformedJson_ReturnsEmpty()
    {
        var raw = "```json\nnot valid json\n```";
        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);
        Assert.Empty(tasks);
    }

    [Fact]
    public void ExtractTasks_PartiallyMalformed_SkipsBadItems()
    {
        var raw = """
            ```json
            [
              {"title":"Good task","description":"desc","priority":"Low"},
              {"missing_title":true},
              {"title":"Another good","description":"desc2","priority":"High"}
            ]
            ```
            """;

        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);

        Assert.Equal(2, tasks.Count);
        Assert.Equal("Good task", tasks[0].Title);
        Assert.Equal("Another good", tasks[1].Title);
    }

    [Fact]
    public void ExtractTasks_UnknownPriority_SkipsItem()
    {
        var raw = """
            ```json
            [{"title":"Task","description":"desc","priority":"Critical"}]
            ```
            """;

        var tasks = PlanConversationQueryHandler.ExtractTasks(raw);
        Assert.Empty(tasks);
    }
}
