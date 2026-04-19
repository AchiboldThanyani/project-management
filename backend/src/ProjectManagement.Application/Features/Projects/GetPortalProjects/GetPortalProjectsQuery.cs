using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;

namespace ProjectManagement.Application.Features.Projects.GetPortalProjects;

public sealed record GetPortalProjectsQuery : IRequest<Result<IReadOnlyList<ProjectDto>>>;
