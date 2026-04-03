using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Tasks.Dependencies.RemoveDependency;

public record RemoveDependencyCommand(Guid DependencyId) : IRequest<Result<Unit>>;
