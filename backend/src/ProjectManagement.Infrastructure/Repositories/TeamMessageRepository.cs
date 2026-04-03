using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TeamMessageRepository(ApplicationDbContext context)
    : Repository<TeamMessage>(context), ITeamMessageRepository { }
