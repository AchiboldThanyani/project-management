using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Projects.CreateProject;

internal sealed class CreateProjectCommandHandler(
    IProjectRepository repository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateProjectCommand, Result<ProjectDto>>
{
    public async Task<Result<ProjectDto>> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        var project = Project.Create(
            request.Name,
            request.OwnerId,
            request.Description,
            request.TeamId,
            request.StartDate,
            request.EndDate);

        await repository.AddAsync(project, cancellationToken);

        var log = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"created project \"{request.Name}\"", "Project", project.Id, request.Name,
            projectId: project.Id);
        await activityRepository.AddAsync(log, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<ProjectDto>(project);
    }
}
