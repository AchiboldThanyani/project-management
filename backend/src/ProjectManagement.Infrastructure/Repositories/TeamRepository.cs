using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TeamRepository(ApplicationDbContext context)
    : Repository<Team>(context), ITeamRepository { }
