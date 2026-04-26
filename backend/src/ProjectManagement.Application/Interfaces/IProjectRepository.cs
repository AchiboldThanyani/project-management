using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IProjectRepository : IRepository<Project>
{
    Task<(IReadOnlyList<Project> Items, int TotalCount)> GetProjectsForUserAsync(
        string userId, bool isAdmin, int page, int pageSize, CancellationToken ct = default);
}
