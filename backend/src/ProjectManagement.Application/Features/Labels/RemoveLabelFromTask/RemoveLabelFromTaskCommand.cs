using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Labels.RemoveLabelFromTask;

public record RemoveLabelFromTaskCommand(Guid TaskId, Guid LabelId) : IRequest<Result<Unit>>;
