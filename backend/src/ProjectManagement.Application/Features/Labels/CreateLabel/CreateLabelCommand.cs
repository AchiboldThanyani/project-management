using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Labels.DTOs;

namespace ProjectManagement.Application.Features.Labels.CreateLabel;

public record CreateLabelCommand(Guid ProjectId, string Name, string Color) : IRequest<Result<LabelDto>>;
