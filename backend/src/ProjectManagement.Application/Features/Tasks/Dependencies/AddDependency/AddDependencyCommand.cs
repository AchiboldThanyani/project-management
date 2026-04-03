using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.Dependencies.AddDependency;

/// <summary>Make <paramref name="BlockingTaskId"/> block <paramref name="BlockedTaskId"/>.</summary>
public record AddDependencyCommand(Guid BlockingTaskId, Guid BlockedTaskId) : IRequest<Result<Unit>>;
