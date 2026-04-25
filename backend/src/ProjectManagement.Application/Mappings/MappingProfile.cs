using AutoMapper;
using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Features.Tasks.Dependencies.DTOs;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Features.Tasks.Attachments;
using ProjectManagement.Application.Features.Tasks.SubTasks;
using ProjectManagement.Application.Features.Tasks.TimeLogs;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Project, ProjectDto>();

        CreateMap<Label, LabelDto>();

        // Maps a TaskDependency row to the "other side" ref including the dependency row Id
        CreateMap<TaskDependency, DependencyTaskRef>()
            .ForMember(d => d.DependencyId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.Id,           o => o.MapFrom(s => s.BlockingTask.Id))
            .ForMember(d => d.Title,        o => o.MapFrom(s => s.BlockingTask.Title))
            .ForMember(d => d.Status,       o => o.MapFrom(s => s.BlockingTask.Status))
            .ForMember(d => d.ProjectId,    o => o.MapFrom(s => s.BlockingTask.ProjectId));

        // Separate map for the "blocking" side (where this task is the blocker)
        CreateMap<TaskDependency, DependencyTaskRef>()
            .ForMember(d => d.DependencyId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.Id,           o => o.MapFrom(s => s.BlockedTask.Id))
            .ForMember(d => d.Title,        o => o.MapFrom(s => s.BlockedTask.Title))
            .ForMember(d => d.Status,       o => o.MapFrom(s => s.BlockedTask.Status))
            .ForMember(d => d.ProjectId,    o => o.MapFrom(s => s.BlockedTask.ProjectId));

        CreateMap<TaskAttachment, TaskAttachmentDto>();

        CreateMap<SubTask, SubTaskDto>();

        CreateMap<TimeLog, TimeLogDto>()
            .ForMember(d => d.UserName, o => o.Ignore());

        CreateMap<ProjectTask, TaskDto>()
            .ForMember(d => d.AssigneeName,      o => o.Ignore())
            .ForMember(d => d.Labels,            o => o.MapFrom(s => s.Labels))
            .ForMember(d => d.SubTasks,          o => o.MapFrom(s => s.SubTasks.OrderBy(st => st.Order)))
            .ForMember(d => d.TimeLogs,          o => o.MapFrom(s => s.TimeLogs.OrderByDescending(tl => tl.LoggedDate)))
            .ForMember(d => d.TotalLoggedHours,  o => o.MapFrom(s => s.TimeLogs.Sum(tl => tl.Hours)))
            .ForMember(d => d.Attachments,       o => o.MapFrom(s => s.Attachments.OrderByDescending(a => a.CreatedAt)))
            .ForMember(d => d.BlockedBy,         o => o.MapFrom(s => s.BlockedByDependencies.Select(dep =>
                new DependencyTaskRef { DependencyId = dep.Id, Id = dep.BlockingTask.Id,
                    Title = dep.BlockingTask.Title, Status = dep.BlockingTask.Status,
                    ProjectId = dep.BlockingTask.ProjectId })))
            .ForMember(d => d.Blocking,          o => o.MapFrom(s => s.BlockingDependencies.Select(dep =>
                new DependencyTaskRef { DependencyId = dep.Id, Id = dep.BlockedTask.Id,
                    Title = dep.BlockedTask.Title, Status = dep.BlockedTask.Status,
                    ProjectId = dep.BlockedTask.ProjectId })))
            .ForMember(d => d.IsBlocked,         o => o.Ignore());

        CreateMap<Sprint, SprintDto>();

        CreateMap<Team, TeamDto>()
            .ForMember(d => d.Members, o => o.MapFrom(s => s.Members));

        CreateMap<TeamMember, TeamMemberDto>()
            .ForMember(d => d.FullName, o => o.Ignore())
            .ForMember(d => d.Email, o => o.Ignore())
            .ForMember(d => d.JoinedAt, o => o.MapFrom(s => s.CreatedAt));

        CreateMap<Comment, TaskCommentDto>()
            .ForMember(d => d.AuthorName, o => o.Ignore());

        CreateMap<Comment, ProjectManagement.Application.Features.Comments.DTOs.CommentDto>()
            .ForMember(d => d.AuthorName, o => o.Ignore());
    }
}
