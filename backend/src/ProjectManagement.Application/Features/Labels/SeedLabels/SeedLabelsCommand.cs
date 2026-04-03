using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Labels.SeedLabels;

public record SeedLabelsCommand(Guid ProjectId) : IRequest<Result<Unit>>;
