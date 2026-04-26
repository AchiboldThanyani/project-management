using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Tests.ProjectBoards;

public class ProjectBoardEntityTests
{
    [Fact]
    public void Create_SetsAllProperties()
    {
        var projectId = Guid.NewGuid();
        var createdById = Guid.NewGuid().ToString();

        var board = ProjectBoard.Create("Sprint 3 Planning", projectId, createdById);

        Assert.Equal("Sprint 3 Planning", board.Title);
        Assert.Equal(projectId, board.ProjectId);
        Assert.Equal(createdById, board.CreatedById);
        Assert.Equal(string.Empty, board.ContentJson);
        Assert.NotEqual(Guid.Empty, board.Id);
    }

    [Fact]
    public void UpdateTitle_ChangesTitle()
    {
        var board = ProjectBoard.Create("Old Title", Guid.NewGuid(), Guid.NewGuid().ToString());
        board.UpdateTitle("New Title");
        Assert.Equal("New Title", board.Title);
    }

    [Fact]
    public void UpdateContent_ChangesContentJson()
    {
        var board = ProjectBoard.Create("Board", Guid.NewGuid(), Guid.NewGuid().ToString());
        var json = "{\"elements\":[]}";
        board.UpdateContent(json);
        Assert.Equal(json, board.ContentJson);
    }
}
