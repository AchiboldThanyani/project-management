using ProjectManagement.Application.Features.Comments.CreateComment;

namespace ProjectManagement.Application.Tests.Comments;

public class MentionExtractionTests
{
    [Fact]
    public void ExtractMentionedUserIds_NoMentions_ReturnsEmpty()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds("Hello world");
        Assert.Empty(result);
    }

    [Fact]
    public void ExtractMentionedUserIds_OneMention_ReturnsId()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "Hey @[John Doe](abc-123) can you check?");
        Assert.Single(result);
        Assert.Contains("abc-123", result);
    }

    [Fact]
    public void ExtractMentionedUserIds_MultipleMentions_ReturnsAllIds()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "@[Alice](user-1) and @[Bob](user-2) please review");
        Assert.Equal(2, result.Count);
        Assert.Contains("user-1", result);
        Assert.Contains("user-2", result);
    }

    [Fact]
    public void ExtractMentionedUserIds_DuplicateMention_DeduplicatesIds()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "@[Alice](user-1) hey @[Alice](user-1) again");
        Assert.Single(result);
        Assert.Contains("user-1", result);
    }

    [Fact]
    public void ExtractMentionedUserIds_MalformedSyntax_ReturnsEmpty()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "@Alice plain text @[NoClosing(user-1)");
        Assert.Empty(result);
    }
}
