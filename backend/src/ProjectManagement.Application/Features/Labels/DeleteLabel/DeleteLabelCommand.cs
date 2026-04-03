using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Labels.DeleteLabel;

public record DeleteLabelCommand(Guid LabelId) : IRequest<Result<Unit>>;
