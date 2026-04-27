using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Ai.Plan.CreateProjectWithPlan;

internal sealed class CreateProjectWithPlanCommandHandler(
    IProjectRepository projectRepository,
    ITaskRepository taskRepository,
    IActivityRepository activityRepository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateProjectWithPlanCommand, Result<ProjectDto>>
{
    public async Task<Result<ProjectDto>> Handle(CreateProjectWithPlanCommand req, CancellationToken ct)
    {
        if (!currentUser.IsProjectManager && !currentUser.IsAdmin)
            return Error.Forbidden("Plan.Forbidden", "Only Project Managers and Admins can apply a plan.");

        var project = Project.Create(req.Name, currentUser.UserId, req.Description);
        await projectRepository.AddAsync(project, ct);

        var projectLog = ActivityLog.Create(currentUser.UserId, currentUser.FullName,
            $"created project \"{req.Name}\" from AI plan", "Project", project.Id, req.Name);
        await activityRepository.AddAsync(projectLog, ct);

        foreach (var item in req.Tasks)
        {
            var task = ProjectTask.Create(
                title: item.Title,
                projectId: project.Id,
                reporterId: currentUser.UserId,
                description: item.Description,
                priority: item.Priority);
            await taskRepository.AddAsync(task, ct);
        }

        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<ProjectDto>(project);
    }
}
