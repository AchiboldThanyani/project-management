using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Projects.UpdateProject;

internal sealed class UpdateProjectCommandHandler(
    IProjectRepository repository,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateProjectCommand, Result<ProjectDto>>
{
    public async Task<Result<ProjectDto>> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (project is null)
            return ProjectErrors.NotFound(request.Id);

        project.Update(request.Name, request.Description, request.Status, request.StartDate, request.EndDate);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return mapper.Map<ProjectDto>(project);
    }
}
