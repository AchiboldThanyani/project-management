using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Labels.DTOs;

namespace ProjectManagement.Application.Features.Labels.GetLabelsByProject;

public record GetLabelsByProjectQuery(Guid ProjectId) : IRequest<Result<IReadOnlyList<LabelDto>>>;
