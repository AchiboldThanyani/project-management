using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TeamMemberRepository(ApplicationDbContext context)
    : Repository<TeamMember>(context), ITeamMemberRepository { }
