using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

internal sealed class IssueRepository(ApplicationDbContext db)
    : Repository<Issue>(db), IIssueRepository
{
    public async Task<int> GetNextNumberAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var max = await db.Issues
            .Where(i => i.ProjectId == projectId)
            .MaxAsync(i => (int?)i.Number, cancellationToken);
        return (max ?? 0) + 1;
    }

    public async Task<IssueDto?> GetDtoByIdAsync(Guid issueId, CancellationToken cancellationToken = default)
    {
        return await db.Issues
            .Where(i => i.Id == issueId)
            .Select(i => new IssueDto
            {
                Id = i.Id,
                Number = i.Number,
                Title = i.Title,
                Description = i.Description,
                Type = i.Type,
                Status = i.Status,
                Priority = i.Priority,
                ProjectId = i.ProjectId,
                ReporterId = i.ReporterId,
                ReporterName = db.Users
                    .Where(u => u.Id == i.ReporterId)
                    .Select(u => u.FirstName + " " + u.LastName)
                    .FirstOrDefault(),
                AssigneeId = i.AssigneeId,
                AssigneeName = i.AssigneeId != null
                    ? db.Users.Where(u => u.Id == i.AssigneeId)
                              .Select(u => u.FirstName + " " + u.LastName)
                              .FirstOrDefault()
                    : null,
                ConvertedToTaskId = i.ConvertedToTaskId,
                CommentCount = i.Comments.Count,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt,
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<IssueDto> Items, int TotalCount)> GetPagedByProjectAsync(
        Guid projectId, IssueStatus? status, IssueType? type, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = db.Issues.Where(i => i.ProjectId == projectId);

        if (status.HasValue) query = query.Where(i => i.Status == status.Value);
        if (type.HasValue)   query = query.Where(i => i.Type == type.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new IssueDto
            {
                Id = i.Id,
                Number = i.Number,
                Title = i.Title,
                Description = i.Description,
                Type = i.Type,
                Status = i.Status,
                Priority = i.Priority,
                ProjectId = i.ProjectId,
                ReporterId = i.ReporterId,
                ReporterName = db.Users
                    .Where(u => u.Id == i.ReporterId)
                    .Select(u => u.FirstName + " " + u.LastName)
                    .FirstOrDefault(),
                AssigneeId = i.AssigneeId,
                AssigneeName = i.AssigneeId != null
                    ? db.Users.Where(u => u.Id == i.AssigneeId)
                              .Select(u => u.FirstName + " " + u.LastName)
                              .FirstOrDefault()
                    : null,
                ConvertedToTaskId = i.ConvertedToTaskId,
                CommentCount = i.Comments.Count,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt,
            })
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddCommentAsync(IssueComment comment, CancellationToken cancellationToken = default)
    {
        await db.IssueComments.AddAsync(comment, cancellationToken);
    }

    public async Task<IReadOnlyList<IssueCommentDto>> GetCommentsAsync(Guid issueId, CancellationToken cancellationToken = default)
    {
        return await db.IssueComments
            .Where(c => c.IssueId == issueId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new IssueCommentDto
            {
                Id = c.Id,
                Content = c.Content,
                AuthorId = c.AuthorId,
                AuthorName = db.Users
                    .Where(u => u.Id == c.AuthorId)
                    .Select(u => u.FirstName + " " + u.LastName)
                    .FirstOrDefault(),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
            })
            .ToListAsync(cancellationToken);
    }
}
