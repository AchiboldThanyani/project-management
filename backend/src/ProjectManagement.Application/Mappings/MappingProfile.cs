using AutoMapper;
using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Features.Projects.DTOs;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Application.Features.Teams.DTOs;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Project, ProjectDto>();

        CreateMap<Label, LabelDto>();

        CreateMap<ProjectTask, TaskDto>()
            .ForMember(d => d.AssigneeName, o => o.Ignore())
            .ForMember(d => d.Labels, o => o.MapFrom(s => s.Labels));

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
