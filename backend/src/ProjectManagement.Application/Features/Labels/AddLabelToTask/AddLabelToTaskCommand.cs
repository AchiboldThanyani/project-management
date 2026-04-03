using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Labels.AddLabelToTask;

public record AddLabelToTaskCommand(Guid TaskId, Guid LabelId) : IRequest<Result<Unit>>;
