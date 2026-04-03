using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Features.Labels.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class LabelRepository(ApplicationDbContext db)
    : Repository<Label>(db), ILabelRepository
{
    private static readonly (string Name, string Color)[] Defaults =
    [
        ("Frontend",  "violet"),
        ("Backend",   "blue"),
        ("Full Stack","teal"),
        ("Security",  "rose"),
        ("Bug Fix",   "amber"),
        ("Docs",      "soft"),
        ("DevOps",    "emerald"),
    ];

    public async Task<IReadOnlyList<LabelDto>> GetByProjectAsync(Guid projectId, CancellationToken ct = default) =>
        await db.Labels
            .Where(l => l.ProjectId == projectId)
            .OrderBy(l => l.Name)
            .Select(l => new LabelDto { Id = l.Id, Name = l.Name, Color = l.Color, ProjectId = l.ProjectId })
            .ToListAsync(ct);

    public async Task<Label?> GetByIdWithTasksAsync(Guid labelId, CancellationToken ct = default) =>
        await db.Labels.Include(l => l.Tasks).FirstOrDefaultAsync(l => l.Id == labelId, ct);

    public async Task SeedDefaultLabelsAsync(Guid projectId, CancellationToken ct = default)
    {
        var hasAny = await db.Labels.AnyAsync(l => l.ProjectId == projectId, ct);
        if (hasAny) return;

        var labels = Defaults.Select(d => Label.Create(d.Name, d.Color, projectId));
        await db.Labels.AddRangeAsync(labels, ct);
    }
}
