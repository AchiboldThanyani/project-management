using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class TaskDependencyRepository(ApplicationDbContext db)
    : Repository<TaskDependency>(db), ITaskDependencyRepository { }
