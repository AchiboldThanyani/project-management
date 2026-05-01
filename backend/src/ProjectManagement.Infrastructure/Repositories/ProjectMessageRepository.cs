using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class ProjectMessageRepository(ApplicationDbContext context)
    : Repository<ProjectMessage>(context), IProjectMessageRepository { }
