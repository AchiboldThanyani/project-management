using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Interfaces;

public interface IProjectRepository : IRepository<Project>
{
    Task<(IReadOnlyList<Project> Items, int TotalCount)> GetProjectsForUserAsync(
        string userId, bool isAdmin, int page, int pageSize, CancellationToken ct = default);

    Task<IReadOnlyList<ProjectSummary>> GetProjectSummariesForUserAsync(
        string userId, bool seeAll, CancellationToken ct = default);
}
