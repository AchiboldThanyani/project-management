using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class BoardRepository(ApplicationDbContext context)
    : Repository<ProjectBoard>(context), IBoardRepository
{
    public async Task<IReadOnlyList<ProjectBoard>> GetBoardsByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.ProjectBoards
            .Where(b => b.ProjectId == projectId)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync(ct);
}
