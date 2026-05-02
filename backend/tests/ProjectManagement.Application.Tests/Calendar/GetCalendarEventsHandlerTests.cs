using System.Linq.Expressions;
using NSubstitute;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Calendar.GetCalendarEvents;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Tests.Calendar;

public class GetCalendarEventsHandlerTests
{
    private static readonly DateTime RangeStart = new(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime RangeEnd   = new(2026, 5, 31, 0, 0, 0, DateTimeKind.Utc);

    private static GetCalendarEventsQueryHandler BuildHandler(
        IProjectRepository projectRepo,
        ITaskRepository taskRepo,
        ISprintRepository sprintRepo,
        ICurrentUserService currentUser)
        => new(projectRepo, taskRepo, sprintRepo, currentUser);

    [Fact]
    public async Task Handle_StaffUser_CallsRepoWithSeeAllFalse()
    {
        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns("staff1");
        currentUser.IsAdmin.Returns(false);
        currentUser.IsProjectManager.Returns(false);

        var projectRepo = Substitute.For<IProjectRepository>();
        projectRepo.GetProjectSummariesForUserAsync("staff1", false, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProjectSummary>());

        var taskRepo   = Substitute.For<ITaskRepository>();
        var sprintRepo = Substitute.For<ISprintRepository>();

        var handler = BuildHandler(projectRepo, taskRepo, sprintRepo, currentUser);
        var result  = await handler.Handle(new GetCalendarEventsQuery(RangeStart, RangeEnd), CancellationToken.None);

        Assert.True(result.IsSuccess);
        await projectRepo.Received(1).GetProjectSummariesForUserAsync("staff1", false, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_AdminUser_CallsRepoWithSeeAllTrue()
    {
        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns("admin1");
        currentUser.IsAdmin.Returns(true);
        currentUser.IsProjectManager.Returns(false);

        var projectRepo = Substitute.For<IProjectRepository>();
        projectRepo.GetProjectSummariesForUserAsync("admin1", true, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProjectSummary>());

        var taskRepo   = Substitute.For<ITaskRepository>();
        var sprintRepo = Substitute.For<ISprintRepository>();

        var handler = BuildHandler(projectRepo, taskRepo, sprintRepo, currentUser);
        await handler.Handle(new GetCalendarEventsQuery(RangeStart, RangeEnd), CancellationToken.None);

        await projectRepo.Received(1).GetProjectSummariesForUserAsync("admin1", true, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ProjectManagerUser_CallsRepoWithSeeAllTrue()
    {
        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns("pm1");
        currentUser.IsAdmin.Returns(false);
        currentUser.IsProjectManager.Returns(true);

        var projectRepo = Substitute.For<IProjectRepository>();
        projectRepo.GetProjectSummariesForUserAsync("pm1", true, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProjectSummary>());

        var taskRepo   = Substitute.For<ITaskRepository>();
        var sprintRepo = Substitute.For<ISprintRepository>();

        var handler = BuildHandler(projectRepo, taskRepo, sprintRepo, currentUser);
        await handler.Handle(new GetCalendarEventsQuery(RangeStart, RangeEnd), CancellationToken.None);

        await projectRepo.Received(1).GetProjectSummariesForUserAsync("pm1", true, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NoProjects_ReturnsEmptyList_WithoutQueryingTasksOrSprints()
    {
        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns("staff1");
        currentUser.IsAdmin.Returns(false);
        currentUser.IsProjectManager.Returns(false);

        var projectRepo = Substitute.For<IProjectRepository>();
        projectRepo.GetProjectSummariesForUserAsync(Arg.Any<string>(), Arg.Any<bool>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProjectSummary>());

        var taskRepo   = Substitute.For<ITaskRepository>();
        var sprintRepo = Substitute.For<ISprintRepository>();

        var handler = BuildHandler(projectRepo, taskRepo, sprintRepo, currentUser);
        var result  = await handler.Handle(new GetCalendarEventsQuery(RangeStart, RangeEnd), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!);
        await taskRepo.DidNotReceive().FindAsync(
            Arg.Any<Expression<Func<ProjectTask, bool>>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TaskWithDueDate_MappedToCalendarEvent()
    {
        var projectId   = Guid.NewGuid();
        var projectName = "Alpha";
        var dueDate     = new DateTime(2026, 5, 10, 0, 0, 0, DateTimeKind.Utc);

        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns("staff1");
        currentUser.IsAdmin.Returns(false);
        currentUser.IsProjectManager.Returns(false);

        var projectRepo = Substitute.For<IProjectRepository>();
        projectRepo.GetProjectSummariesForUserAsync(Arg.Any<string>(), Arg.Any<bool>(), Arg.Any<CancellationToken>())
            .Returns(new[] { new ProjectSummary(projectId, projectName) });

        var task = ProjectTask.Create("Fix login bug", projectId, "staff1", 1,
            priority: TaskPriority.High, dueDate: dueDate);

        var taskRepo = Substitute.For<ITaskRepository>();
        taskRepo.FindAsync(Arg.Any<Expression<Func<ProjectTask, bool>>>(), Arg.Any<CancellationToken>())
            .Returns(new[] { task });

        var sprintRepo = Substitute.For<ISprintRepository>();
        sprintRepo.FindAsync(Arg.Any<Expression<Func<Sprint, bool>>>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Sprint>());

        var handler = BuildHandler(projectRepo, taskRepo, sprintRepo, currentUser);
        var result  = await handler.Handle(new GetCalendarEventsQuery(RangeStart, RangeEnd), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var ev = Assert.Single(result.Value!);
        Assert.Equal("Task", ev.Type);
        Assert.Equal("Fix login bug", ev.Title);
        Assert.Equal(projectId, ev.ProjectId);
        Assert.Equal(projectName, ev.ProjectName);
        Assert.Equal("High", ev.Priority);
        Assert.Equal("#f97316", ev.Color);
        Assert.False(ev.IsCompleted);
    }

    [Fact]
    public async Task Handle_Sprint_MappedToCalendarEvent()
    {
        var projectId   = Guid.NewGuid();
        var sprintStart = new DateTime(2026, 5, 4, 0, 0, 0, DateTimeKind.Utc);
        var sprintEnd   = new DateTime(2026, 5, 17, 0, 0, 0, DateTimeKind.Utc);

        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.UserId.Returns("staff1");
        currentUser.IsAdmin.Returns(false);
        currentUser.IsProjectManager.Returns(false);

        var projectRepo = Substitute.For<IProjectRepository>();
        projectRepo.GetProjectSummariesForUserAsync(Arg.Any<string>(), Arg.Any<bool>(), Arg.Any<CancellationToken>())
            .Returns(new[] { new ProjectSummary(projectId, "Beta") });

        var taskRepo = Substitute.For<ITaskRepository>();
        taskRepo.FindAsync(Arg.Any<Expression<Func<ProjectTask, bool>>>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProjectTask>());

        var sprint = Sprint.Create("Sprint 3", projectId, sprintStart, sprintEnd);
        var sprintRepo = Substitute.For<ISprintRepository>();
        sprintRepo.FindAsync(Arg.Any<Expression<Func<Sprint, bool>>>(), Arg.Any<CancellationToken>())
            .Returns(new[] { sprint });

        var handler = BuildHandler(projectRepo, taskRepo, sprintRepo, currentUser);
        var result  = await handler.Handle(new GetCalendarEventsQuery(RangeStart, RangeEnd), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var ev = Assert.Single(result.Value!);
        Assert.Equal("Sprint", ev.Type);
        Assert.Equal("Sprint 3", ev.Title);
        Assert.Equal(sprintStart, ev.Start);
        Assert.Equal(sprintEnd, ev.End);
        Assert.Null(ev.Priority);
    }
}
