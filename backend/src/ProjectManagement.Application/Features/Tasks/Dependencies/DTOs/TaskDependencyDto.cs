using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Application.Features.Tasks.Dependencies.DTOs;

/// <summary>Slim task summary used inside dependency lists.</summary>
public record DependencyTaskRef
{
    /// <summary>The TaskDependency row ID — used to remove the link.</summary>
    public Guid DependencyId { get; init; }
    public Guid   Id         { get; init; }
    public string Title      { get; init; } = default!;
    public TaskStatus Status { get; init; }
    public Guid   ProjectId  { get; init; }
}
